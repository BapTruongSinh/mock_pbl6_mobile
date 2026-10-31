import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getOnlineAdbDevices } from './run-case.mjs';
import {
  dumpUiAutomatorHierarchy,
  killProcessTreeOnWindows,
  readNativeStorageProof,
  restoreAndVerifyDeviceState,
  runAdb,
  saveDeviceRecoveryState,
  sleepMs,
} from './native-device-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export function evaluateColdStorageProof(before, after) {
  const valid = (proof) =>
    proof &&
    proof.snapshotPersisted === true &&
    Number.isFinite(proof.coldLaunchCount) &&
    proof.coldLaunchCount > 0 &&
    Number.isFinite(proof.snapshotBytes) &&
    proof.snapshotBytes > 0;
  if (
    !valid(before) ||
    !valid(after) ||
    after.coldLaunchCount <= before.coldLaunchCount ||
    after.firstLaunchAt !== before.firstLaunchAt
  ) {
    return {
      ok: false,
      code: 'cold-storage-proof-invalid',
      message:
        'Native snapshot proof missing, unpersisted, changed identity, or cold-launch count did not increase',
    };
  }
  return { ok: true };
}

function checkMetroStatus(port = 8081) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/status`, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const projectRootHeader =
          res.headers['X-React-Native-Project-Root'] || res.headers['x-react-native-project-root'];
        let decodedRoot = null;
        if (typeof projectRootHeader === 'string') {
          try {
            decodedRoot = decodeURIComponent(projectRootHeader);
          } catch {
            decodedRoot = projectRootHeader;
          }
        }
        resolve({
          running: data.includes('packager-status:running'),
          projectRoot: decodedRoot,
        });
      });
    });
    req.on('error', () => resolve({ running: false, projectRoot: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ running: false, projectRoot: null });
    });
  });
}

function dismissDevMenuOnboardingIfPresent(adbBin, serial, xmlText) {
  if (!xmlText.includes('This is the developer menu') && !xmlText.includes('text="Continue"')) {
    return false;
  }
  const continueMatch = /text="Continue"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xmlText);
  if (continueMatch) {
    const cx = Math.round((Number(continueMatch[1]) + Number(continueMatch[3])) / 2);
    const cy = Math.round((Number(continueMatch[2]) + Number(continueMatch[4])) / 2);
    runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
    sleepMs(400);
    return true;
  }
  const closeMatch = /content-desc="Close"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(
    xmlText,
  );
  if (closeMatch) {
    const cx = Math.round((Number(closeMatch[1]) + Number(closeMatch[3])) / 2);
    const cy = Math.round((Number(closeMatch[2]) + Number(closeMatch[4])) / 2);
    runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
    sleepMs(400);
    return true;
  }
  return false;
}

function waitForJsBundleMount(adbBin, serial, maxAttempts = 25) {
  for (let i = 0; i < maxAttempts; i += 1) {
    let dump;
    try {
      dump = dumpUiAutomatorHierarchy(adbBin, serial);
    } catch {
      sleepMs(600);
      continue;
    }
    const xmlText = dump.xmlText || '';
    if (dismissDevMenuOnboardingIfPresent(adbBin, serial, xmlText)) {
      continue;
    }
    if (xmlText.includes('screen.FOUNDATION-SMOKE') && xmlText.includes('foundation.anchor')) {
      return { mounted: true, xmlText };
    }
    sleepMs(600);
  }
  return { mounted: false, xmlText: '' };
}

export function verifyAndroidSmokeOnDevice(adbBin, serial, port = 8081) {
  runAdb(adbBin, serial, ['reverse', `tcp:${port}`, `tcp:${port}`]);

  const pkgCheck = runAdb(adbBin, serial, ['shell', 'pm', 'path', 'vn.blue.mobile']);
  if (pkgCheck.status !== 0 || !(pkgCheck.stdout || '').includes('package:')) {
    return {
      ok: false,
      code: 'apk-not-installed',
      message: 'Package vn.blue.mobile is not installed on target device',
    };
  }

  runAdb(adbBin, serial, [
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `bluemobile://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`,
    'vn.blue.mobile',
  ]);

  const actDump = runAdb(adbBin, serial, ['shell', 'dumpsys', 'activity', 'activities']);
  const actText = actDump.stdout || '';
  if (!actText.includes('vn.blue.mobile')) {
    return {
      ok: false,
      code: 'activity-not-resumed',
      message: 'vn.blue.mobile/.MainActivity is not in resumed activities',
    };
  }

  const firstMount = waitForJsBundleMount(adbBin, serial, 25);
  if (!firstMount.mounted) {
    return {
      ok: false,
      code: 'js-bundle-not-mounted',
      message:
        'APK launched but development JS bundle root (screen.FOUNDATION-SMOKE / foundation.anchor) is not mounted',
    };
  }

  // Cold relaunch verification: force-stop and relaunch to prove private-file persistence on Android device
  let proofBefore = readNativeStorageProof(adbBin, serial);
  for (let p = 0; p < 10 && !proofBefore?.snapshotPersisted; p += 1) {
    sleepMs(300);
    proofBefore = readNativeStorageProof(adbBin, serial);
  }

  runAdb(adbBin, serial, ['shell', 'am', 'force-stop', 'vn.blue.mobile']);
  sleepMs(500);
  runAdb(adbBin, serial, ['reverse', `tcp:${port}`, `tcp:${port}`]);
  runAdb(adbBin, serial, [
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `bluemobile://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`,
    'vn.blue.mobile',
  ]);
  const secondMount = waitForJsBundleMount(adbBin, serial, 35);
  if (!secondMount.mounted) {
    return {
      ok: false,
      code: 'cold-relaunch-failed',
      message: 'Cold relaunch after am force-stop failed to mount JS bundle',
    };
  }
  let proofAfter = readNativeStorageProof(adbBin, serial);
  for (
    let p = 0;
    p < 10 &&
    (!proofAfter ||
      (proofBefore?.coldLaunchCount && proofAfter.coldLaunchCount <= proofBefore.coldLaunchCount));
    p += 1
  ) {
    sleepMs(300);
    proofAfter = readNativeStorageProof(adbBin, serial);
  }

  runAdb(adbBin, serial, [
    'shell',
    'run-as',
    'vn.blue.mobile',
    'rm',
    '-f',
    'files/foundation-failed-save-proof.json',
  ]);
  runAdb(adbBin, serial, [
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    'bluemobile://debug/case/FOUNDATION-SMOKE?storageProbe=failed-save',
    'vn.blue.mobile',
  ]);
  let failedSaveProof = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    failedSaveProof = readNativeStorageProof(adbBin, serial, 'foundation-failed-save-proof.json');
    if (failedSaveProof) break;
    sleepMs(300);
  }
  if (
    !failedSaveProof?.passed ||
    failedSaveProof.saveAcknowledged !== false ||
    !failedSaveProof.moveAttempted ||
    !failedSaveProof.priorSnapshotPreserved ||
    !failedSaveProof.tempFileWritten ||
    !failedSaveProof.reloadMatchesCommitted
  ) {
    return {
      ok: false,
      code: 'native-failed-save-proof-invalid',
      message: JSON.stringify(failedSaveProof),
    };
  }
  const storageEvaluation = evaluateColdStorageProof(proofBefore, proofAfter);
  if (!storageEvaluation.ok) return storageEvaluation;
  return {
    ok: true,
    serial,
    storageColdRelaunchProof: {
      before: proofBefore,
      after: proofAfter,
      failedSaveProof,
    },
  };
}

async function main() {
  const { adbBin, devices, error } = getOnlineAdbDevices();
  if (error || devices.length === 0) {
    console.error(
      `[android-smoke] FAIL (blocked-missing-device): No online Android device/emulator attached. ${error ?? ''}`.trim(),
    );
    process.exit(2);
  }

  const serial = devices[0];
  const port = 8081;
  const pidFile = path.join(ROOT_DIR, 'artifacts', '.metro-runner.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });

  const recoveryPath = path.join(ROOT_DIR, 'artifacts', '.device-recovery.json');
  saveDeviceRecoveryState(adbBin, serial, recoveryPath);

  let spawnedMetro = null;

  try {
    const status = await checkMetroStatus(port);
    if (
      status.running &&
      status.projectRoot &&
      path.resolve(status.projectRoot).toLowerCase() !== ROOT_DIR.toLowerCase()
    ) {
      console.error(
        `[android-smoke] FAIL (wrong-metro-root): Port ${port} is occupied by Metro for ${status.projectRoot}, expected ${ROOT_DIR}`,
      );
      process.exitCode = 3;
      return;
    }

    if (!status.running) {
      const resumeDir = path.join(ROOT_DIR, 'artifacts', 'agy', 'plan01', 'task02', 'resume-02');
      const logFile = path.join(resumeDir, 'metro.log');
      const resumePidFile = path.join(resumeDir, 'metro.pid');
      fs.mkdirSync(resumeDir, { recursive: true });
      let logFd = 'ignore';
      try {
        logFd = fs.openSync(logFile, 'a');
      } catch {
        logFd = 'ignore';
      }

      const expoCli = path.join(ROOT_DIR, 'node_modules', 'expo', 'bin', 'cli');
      spawnedMetro = spawn(
        process.execPath,
        [expoCli, 'start', '--dev-client', '--port', String(port)],
        {
          cwd: ROOT_DIR,
          detached: true,
          windowsHide: true,
          stdio: ['ignore', logFd, logFd],
          env: {
            ...process.env,
            CI: '1',
            EXPO_NO_GIT_STATUS: '1',
          },
        },
      );
      spawnedMetro.unref();
      if (typeof logFd === 'number') {
        try {
          fs.closeSync(logFd);
        } catch {
          // Ignore close error
        }
      }
      if (spawnedMetro.pid) {
        fs.writeFileSync(pidFile, String(spawnedMetro.pid), 'utf8');
        fs.writeFileSync(resumePidFile, String(spawnedMetro.pid), 'utf8');
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((r) => setTimeout(r, 500));
        const polled = await checkMetroStatus(port);
        if (polled.running) {
          break;
        }
      }
    }

    const result = verifyAndroidSmokeOnDevice(adbBin, serial, port);
    if (!result.ok) {
      console.error(`[android-smoke] FAIL (${result.code}): ${result.message}`);
      process.exitCode = 1;
      return;
    }

    const storageReportPath = path.join(
      ROOT_DIR,
      'artifacts',
      'FOUNDATION-SMOKE',
      'storage-cold-relaunch-report.json',
    );
    fs.mkdirSync(path.dirname(storageReportPath), { recursive: true });
    fs.writeFileSync(
      storageReportPath,
      JSON.stringify(result.storageColdRelaunchProof, null, 2),
      'utf8',
    );

    console.log(
      `[android-smoke] PASS on ${serial} (coldLaunchCount=${result.storageColdRelaunchProof?.after?.coldLaunchCount ?? 'n/a'}, snapshotPersisted=${String(result.storageColdRelaunchProof?.after?.snapshotPersisted ?? false)})`,
    );
  } finally {
    const restored = restoreAndVerifyDeviceState(adbBin, serial, recoveryPath);
    if (!restored.verified) {
      console.error('[android-smoke] device-restore-verification-failed', restored);
      process.exitCode = 1;
    }
    if (spawnedMetro && spawnedMetro.pid) {
      killProcessTreeOnWindows(spawnedMetro.pid);
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void main();
}
