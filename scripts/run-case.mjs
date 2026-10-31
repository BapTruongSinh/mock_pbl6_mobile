import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ensureMobileMetroRunning,
  launchCaseAndWaitForMount,
  restoreAndVerifyDeviceState,
  saveDeviceRecoveryState,
} from './native-device-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function loadMatrixCases(rootDir = ROOT_DIR) {
  const csvPath = path.join(rootDir, 'docs', 'technical', 'TEST_CASE_MATRIX.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Missing TEST_CASE_MATRIX.csv at ${csvPath}`);
  }
  const lines = fs
    .readFileSync(csvPath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const header = parseCsvLine(lines[0] ?? '');
  const caseIdIdx = header.indexOf('id') >= 0 ? header.indexOf('id') : header.indexOf('case_id');
  const referenceIdx = header.indexOf('reference');
  const statusIdx = header.indexOf('status');
  const routeIdx = header.indexOf('route');

  const map = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const caseId = cols[caseIdIdx]?.trim();
    if (caseId) {
      map.set(caseId, {
        caseId,
        reference: cols[referenceIdx]?.trim() ?? 'unknown',
        status: cols[statusIdx]?.trim() ?? 'unknown',
        route: cols[routeIdx]?.trim() ?? '',
      });
    }
  }
  return map;
}

export function getOnlineAdbDevices(options = {}) {
  const sdkRoot =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    'C:\\Users\\ADMIN\\AppData\\Local\\Android\\Sdk';
  const adbBin = path.join(sdkRoot, 'platform-tools', 'adb.exe');
  const execute = options.spawn ?? spawnSync;
  const exists = options.exists ?? fs.existsSync;
  const wait =
    options.wait ?? ((ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms));
  const serial = options.serial ?? process.env.ANDROID_SERIAL;
  const diagnostics = [];
  if (!exists(adbBin))
    return { adbBin, devices: [], error: 'adb not found at ' + adbBin, diagnostics };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = execute(adbBin, ['devices'], { encoding: 'utf8', timeout: 10000 });
    diagnostics.push({
      attempt: attempt + 1,
      command: 'adb devices',
      status: res.status,
      signal: res.signal ?? null,
      errorCode: res.error?.code ?? null,
      errorMessage: res.error?.message ?? null,
      stdout: res.stdout ?? '',
      stderr: res.stderr ?? '',
    });
    if (!res.error && res.status === 0) {
      const listed = (res.stdout ?? '')
        .split(/\r?\n/)
        .map((line) => /^(\S+)\s+device\s*$/.exec(line.trim())?.[1])
        .filter(Boolean);
      const candidates = serial ? listed.filter((id) => id === serial) : listed;
      if (serial && !candidates.length)
        return {
          adbBin,
          devices: [],
          error: 'Requested serial is not online: ' + serial,
          diagnostics,
        };
      const devices = [];
      for (const id of candidates) {
        const state = execute(adbBin, ['-s', id, 'get-state'], {
          encoding: 'utf8',
          timeout: 10000,
        });
        diagnostics.push({
          command: 'adb -s ' + id + ' get-state',
          status: state.status,
          signal: state.signal ?? null,
          errorCode: state.error?.code ?? null,
          errorMessage: state.error?.message ?? null,
          stdout: state.stdout ?? '',
          stderr: state.stderr ?? '',
        });
        if (!state.error && state.status === 0 && state.stdout?.trim() === 'device')
          devices.push(id);
      }
      if (devices.length) return { adbBin, devices, error: null, diagnostics };
    }
    if (res.error?.code === 'ENOENT' || res.error?.code === 'EACCES') break;
    if (attempt < 2) wait(500);
  }
  return {
    adbBin,
    devices: [],
    error: 'ADB discovery failed: ' + JSON.stringify(diagnostics),
    diagnostics,
  };
}

export function findMaestroBinary(rootDir = ROOT_DIR) {
  const candidates = [
    path.join(rootDir, '.tools', 'maestro', 'maestro', 'bin', 'maestro.bat'),
    path.join(rootDir, '.tools', 'maestro', 'bin', 'maestro.bat'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function validateRunCasePreconditions(caseId, rootDir = ROOT_DIR) {
  if (!caseId || typeof caseId !== 'string') {
    return { ok: false, code: 'missing-case-id', message: 'Case ID argument is required' };
  }
  const cases = loadMatrixCases(rootDir);
  const entry = cases.get(caseId);
  if (!entry) {
    return {
      ok: false,
      code: 'unknown-case',
      message: `Unknown case ID "${caseId}" (not found in TEST_CASE_MATRIX.csv)`,
    };
  }
  if (entry.reference === 'quota-blocked' || entry.status === 'excluded-approved') {
    return {
      ok: false,
      code: 'blocked-source-status',
      message: `Case "${caseId}" has reference="${entry.reference}", status="${entry.status}" and cannot run`,
    };
  }
  const yamlPath = path.join(rootDir, 'tests', 'native', 'cases', `${caseId}.yaml`);
  if (!fs.existsSync(yamlPath)) {
    return {
      ok: false,
      code: 'missing-yaml',
      message: `Missing native flow YAML at ${yamlPath}`,
    };
  }
  return { ok: true, entry, yamlPath };
}

export function buildMaestroInvocation(
  maestroBin,
  serial,
  yamlPath,
  javaHome = 'C:\\Program Files\\Java\\jdk-21',
) {
  const maestroHome = path.resolve(path.dirname(maestroBin), '..');
  const executable = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const args = [
    '--enable-native-access=ALL-UNNAMED',
    '-Dfile.encoding=UTF-8',
    '-Dsun.stdout.encoding=UTF-8',
    '-Dsun.stderr.encoding=UTF-8',
    '-classpath',
    path.join(maestroHome, 'lib', '*'),
    'maestro.cli.AppKt',
    '--device',
    serial,
    'test',
    yamlPath,
  ];
  return {
    executable,
    args,
    shell: false,
  };
}

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
  const printInvIdx = rawArgs.indexOf('--print-invocation');
  if (printInvIdx >= 0) {
    const targetCase = rawArgs[printInvIdx + 1] ?? 'FOUNDATION-SMOKE';
    const check = validateRunCasePreconditions(targetCase, ROOT_DIR);
    if (!check.ok) {
      console.error(`[run-case] FAIL (${check.code}): ${check.message}`);
      process.exit(1);
    }
    const maestroBin =
      findMaestroBinary(ROOT_DIR) ??
      path.join(ROOT_DIR, '.tools', 'maestro', 'maestro', 'bin', 'maestro.bat');
    const invocation = buildMaestroInvocation(
      maestroBin,
      'emulator-5554',
      check.yamlPath,
      'C:\\Program Files\\Java\\jdk-21',
    );
    console.log(JSON.stringify(invocation, null, 2));
    process.exit(0);
  }

  const logFileIdx = rawArgs.indexOf('--log-file');
  const logFilePath = logFileIdx >= 0 ? path.resolve(rawArgs[logFileIdx + 1] ?? '') : null;
  const positionalArgs = rawArgs.filter(
    (arg, idx) =>
      (logFileIdx < 0 || (idx !== logFileIdx && idx !== logFileIdx + 1)) && !arg.startsWith('--'),
  );
  const caseId = positionalArgs[0];

  const check = validateRunCasePreconditions(caseId, ROOT_DIR);
  if (!check.ok) {
    console.error(`[run-case] FAIL (${check.code}): ${check.message}`);
    process.exit(1);
  }

  const { adbBin, devices, error } = getOnlineAdbDevices();
  if (error || devices.length === 0) {
    console.error(
      `[run-case] FAIL (blocked-missing-device): No online Android device/emulator found via ${adbBin}. ${error ?? ''}`.trim(),
    );
    process.exit(2);
  }

  const maestroBin = findMaestroBinary(ROOT_DIR);
  if (!maestroBin) {
    console.error(
      `[run-case] FAIL (blocked-missing-maestro): Scoped Maestro binary not found under .tools/maestro.`,
    );
    process.exit(3);
  }

  const serial = devices[0];
  const recoveryPath = path.join(ROOT_DIR, 'artifacts', '.device-recovery.json');
  saveDeviceRecoveryState(adbBin, serial, recoveryPath);

  let metro = null;
  try {
    metro = await ensureMobileMetroRunning(ROOT_DIR, 8081);
    launchCaseAndWaitForMount(adbBin, serial, caseId, 160, null, false);

    const invocation = buildMaestroInvocation(
      maestroBin,
      serial,
      check.yamlPath,
      'C:\\Program Files\\Java\\jdk-21',
    );
    const runRes = spawnSync(invocation.executable, invocation.args, {
      encoding: 'utf8',
      shell: false,
      env: {
        ...process.env,
        JAVA_HOME: 'C:\\Program Files\\Java\\jdk-21',
        MAESTRO_CLI_NO_ANALYTICS: '1',
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      },
    });

    const stdoutText = runRes.stdout || '';
    const stderrText = runRes.stderr || '';
    if (stdoutText) {
      process.stdout.write(stdoutText);
    }
    if (stderrText) {
      process.stderr.write(stderrText);
    }
    if (logFilePath) {
      fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
      fs.writeFileSync(
        logFilePath,
        `$ node scripts/run-case.mjs "${caseId}"\n${stdoutText}${stderrText}`,
        'utf8',
      );
    }

    process.exitCode = runRes.status ?? 1;
  } finally {
    const restored = restoreAndVerifyDeviceState(adbBin, serial, recoveryPath);
    if (!restored.verified) {
      console.error('device-restore-verification-failed', restored);
      process.exitCode = 1;
    }
    metro?.stopMetro();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void main();
}
