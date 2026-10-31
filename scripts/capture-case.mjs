import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getOnlineAdbDevices, loadMatrixCases } from './run-case.mjs';
import {
  DEFAULT_ADB_TIMEOUT_MS,
  decodePngRgba,
  evaluateFoundationToggleInk,
  applyDeviceProfile,
  detectHierarchyOverlayContamination,
  ensureMobileMetroRunning,
  launchCaseAndWaitForMount,
  readDeviceMetrics,
  requireNativeWindowTelemetry,
  readNativeOnLayoutTelemetry,
  readPngHeader,
  restoreAndVerifyDeviceState,
  saveDeviceRecoveryState,
} from './native-device-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const CAPTURE_PROFILES = {
  canonical: { width: 390, height: 844, density: 160, fontScale: '1.0', hideBars: true },
  'w320-f1': { width: 320, height: 844, density: 160, fontScale: '1.0', hideBars: true },
  'w360-f1': { width: 360, height: 844, density: 160, fontScale: '1.0', hideBars: true },
  'w412-f1': { width: 412, height: 844, density: 160, fontScale: '1.0', hideBars: true },
  'w480-f1': { width: 480, height: 844, density: 160, fontScale: '1.0', hideBars: true },
  'w390-f1.3': { width: 390, height: 844, density: 160, fontScale: '1.3', hideBars: true },
  'w390-f2': { width: 390, height: 844, density: 160, fontScale: '2.0', hideBars: true },
  'h640-keyboard': { width: 390, height: 640, density: 160, fontScale: '1.0', hideBars: false },
};

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const caseId = args[0];
  const profileIdx = args.indexOf('--profile');
  const profileName = profileIdx >= 0 ? args[profileIdx + 1] : 'canonical';

  if (!caseId) {
    console.error('[capture-case] FAIL: Missing case ID');
    process.exit(1);
  }

  const cases = loadMatrixCases(ROOT_DIR);
  if (!cases.has(caseId)) {
    console.error(`[capture-case] FAIL: Unknown case ID "${caseId}"`);
    process.exit(1);
  }

  const profile = CAPTURE_PROFILES[profileName];
  if (!profile) {
    console.error(`[capture-case] FAIL: Unknown profile "${profileName}"`);
    process.exit(1);
  }

  const { adbBin, devices, error } = getOnlineAdbDevices();
  if (error || devices.length === 0) {
    console.error(
      `[capture-case] FAIL (blocked-missing-device): No online Android device found. ${error ?? ''}`.trim(),
    );
    process.exit(2);
  }

  const serial = devices[0];
  const artifactsDir = path.join(ROOT_DIR, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const recoveryPath = path.join(artifactsDir, '.device-recovery.json');

  const savedBaseline = saveDeviceRecoveryState(adbBin, serial, recoveryPath);
  let metro = null;
  const caseDir = path.join(artifactsDir, caseId);
  fs.mkdirSync(caseDir, { recursive: true });
  let metaObj = null;

  try {
    metro = await ensureMobileMetroRunning(ROOT_DIR, 8081);
    applyDeviceProfile(adbBin, serial, profile);

    let activeMetrics = readDeviceMetrics(adbBin, serial);
    const dump = launchCaseAndWaitForMount(
      adbBin,
      serial,
      caseId,
      activeMetrics.density,
      activeMetrics.logicalCanvas.width,
      profile.hideBars,
      args.includes('--native-fault') ? args[args.indexOf('--native-fault') + 1] : null,
    );

    activeMetrics = requireNativeWindowTelemetry(
      readDeviceMetrics(adbBin, serial),
      profile.hideBars,
    );
    const screenNode = dump.nodes.find((n) => n.id === `screen.${caseId}`);
    if (!screenNode) {
      throw new Error(`Scenario screen.${caseId} did not mount on device ${serial} before capture`);
    }

    fs.writeFileSync(path.join(caseDir, 'uiautomator-dump.xml'), dump.xmlText, 'utf8');

    const imgPath = path.join(caseDir, 'implementation.png');
    const capRes = spawnSync(adbBin, ['-s', serial, 'exec-out', 'screencap', '-p'], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: DEFAULT_ADB_TIMEOUT_MS,
    });
    if (capRes.error?.code === 'ETIMEDOUT' || capRes.status === 124) {
      throw new Error(
        `[capture-case:timeout] adb screencap timed out after ${DEFAULT_ADB_TIMEOUT_MS}ms for case ${caseId}`,
      );
    }
    if (capRes.status !== 0 || !capRes.stdout || capRes.stdout.length < 24) {
      throw new Error('adb screencap failed or returned invalid PNG buffer');
    }
    if (caseId === 'FOUNDATION-SMOKE' && profileName === 'canonical') {
      const toggle = dump.nodes.find((node) => node.id === 'foundation.toggle');
      const ink = evaluateFoundationToggleInk(decodePngRgba(capRes.stdout), toggle);
      if (!ink.valid) throw new Error(`clipped-native-toggle-label: ${JSON.stringify(ink)}`);
    }
    fs.writeFileSync(imgPath, capRes.stdout);
    const pngHeader = readPngHeader(capRes.stdout);

    const onLayoutTelemetry = readNativeOnLayoutTelemetry(adbBin, serial);
    const anchors = {};
    for (const node of dump.nodes) {
      if (node.id) {
        anchors[node.id] = {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          boundsPx: node.boundsPx,
          onLayout: onLayoutTelemetry?.layouts?.[node.id] ?? null,
          source: 'uiautomator',
        };
      }
    }

    metaObj = {
      caseId,
      profile: profileName,
      serial,
      originalDeviceState: savedBaseline,
      physicalSize: activeMetrics.physicalSize,
      effectiveSize: activeMetrics.effectiveSize,
      pngDimensions: { width: pngHeader.width, height: pngHeader.height },
      logicalCanvas: activeMetrics.logicalCanvas,
      physicalDensity: activeMetrics.physicalDensity,
      density: activeMetrics.density,
      fontScale: activeMetrics.fontScale,
      systemBars: activeMetrics.systemBars,
      contentInsets: activeMetrics.contentInsets,
      nativeWindowMetrics: activeMetrics.nativeWindowMetrics,
      crop: { x: 0, y: 0, width: pngHeader.width, height: pngHeader.height, resized: false },
      wmSizeRaw: activeMetrics.wmSizeRaw,
      wmDensityRaw: activeMetrics.wmDensityRaw,
      unexpectedOverlayNodes: detectHierarchyOverlayContamination(dump.nodes, caseId),
      anchors,
      capturedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(caseDir, 'meta.json'), JSON.stringify(metaObj, null, 2), 'utf8');
  } finally {
    const restoreResult = restoreAndVerifyDeviceState(adbBin, serial, recoveryPath);
    metro?.stopMetro();
    if (metaObj) {
      metaObj.restoredState = restoreResult;
      fs.writeFileSync(path.join(caseDir, 'meta.json'), JSON.stringify(metaObj, null, 2), 'utf8');
    }
    if (!restoreResult.verified) {
      console.error(
        `[capture-case] FAIL (device-restore-verification-failed):`,
        JSON.stringify(restoreResult),
      );
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void main();
}
