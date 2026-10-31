import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { spawn, spawnSync } from 'node:child_process';

export const DEFAULT_ADB_TIMEOUT_MS = 15000;

export function runAdb(adbBin, serial, args, options = {}) {
  const timeout = options.timeout ?? DEFAULT_ADB_TIMEOUT_MS;
  let res = spawnSync(adbBin, ['-s', serial, ...args], {
    encoding: 'utf8',
    timeout,
    ...options,
  });
  if (res.error && res.error.code === 'ETIMEDOUT') {
    return {
      status: 124,
      timedOut: true,
      stdout: res.stdout || '',
      stderr: `[runAdb:timeout] Command timed out after ${timeout}ms: adb -s ${serial} ${args.join(' ')}`,
      error: res.error,
    };
  }
  if (res.status === 124) {
    return {
      status: 124,
      timedOut: true,
      stdout: res.stdout || '',
      stderr: `[runAdb:timeout] Command timed out after ${timeout}ms: adb -s ${serial} ${args.join(' ')}`,
      error: res.error || new Error('Command timed out'),
    };
  }
  if (res.stderr && res.stderr.includes('device offline')) {
    spawnSync(adbBin, ['connect', '127.0.0.1:5555'], { encoding: 'utf8', timeout: 5000 });
    res = spawnSync(adbBin, ['-s', serial, ...args], {
      encoding: 'utf8',
      timeout,
      ...options,
    });
    if (res.error && (res.error.code === 'ETIMEDOUT' || res.status === 124)) {
      return {
        status: 124,
        timedOut: true,
        stdout: res.stdout || '',
        stderr: `[runAdb:timeout] Command timed out after ${timeout}ms: adb -s ${serial} ${args.join(' ')}`,
        error: res.error,
      };
    }
  }
  return res;
}

export function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parseSizePair(line) {
  const match = /(\d+)x(\d+)/.exec(line || '');
  if (!match) {
    return null;
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseDensityValue(line) {
  const match = /(\d+)/.exec(line || '');
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function validateNativeWindowTelemetry(value, expected) {
  return Boolean(
    value &&
    value.source === 'WindowManager.currentWindowMetrics+decorView.rootWindowInsets' &&
    value.windowBoundsPx?.width === expected.width &&
    value.windowBoundsPx?.height === expected.height &&
    value.density === expected.density &&
    Math.abs(value.fontScale - expected.fontScale) < 0.05 &&
    typeof value.statusBarVisible === 'boolean' &&
    typeof value.navigationBarVisible === 'boolean' &&
    ['left', 'top', 'right', 'bottom'].every(
      (key) =>
        Number.isFinite(value.systemBarsInsetsPx?.[key]) && value.systemBarsInsetsPx[key] >= 0,
    ),
  );
}

export function requireNativeWindowTelemetry(metrics, expectedHideBars = null) {
  if (!metrics.nativeWindowMetrics)
    throw new Error('missing-or-stale-native-window-metrics: no heuristic fallback permitted');
  if (typeof expectedHideBars === 'boolean') {
    const native = metrics.nativeWindowMetrics;
    if (
      expectedHideBars
        ? native.statusBarVisible || native.navigationBarVisible
        : !native.statusBarVisible || !native.navigationBarVisible
    ) {
      throw new Error(
        'native-system-bar-visibility-mismatch: measured bars do not match requested profile',
      );
    }
  }
  return metrics;
}

function metricReadOptions(options) {
  if (!options.deadlineAt) return {};
  const remaining = options.deadlineAt - Date.now();
  if (remaining <= 0) throw new Error('layout-profile-deadline-exceeded');
  return { timeout: Math.min(3500, remaining) };
}
function readRequiredAdbText(adbBin, serial, args, options = {}) {
  const result = runAdb(adbBin, serial, args, metricReadOptions(options));
  const text = (result.stdout || '').trim();
  if (result.status !== 0 || !text)
    throw new Error(
      `device-metrics-read-failed: ${args.join(' ')}: ${result.stderr || result.status}`,
    );
  return text;
}

export function readDeviceMetrics(adbBin, serial, options = {}) {
  const sizeOut = readRequiredAdbText(adbBin, serial, ['shell', 'wm', 'size'], options);
  const densityOut = readRequiredAdbText(adbBin, serial, ['shell', 'wm', 'density'], options);
  const fontOut = readRequiredAdbText(
    adbBin,
    serial,
    ['shell', 'settings', 'get', 'system', 'font_scale'],
    options,
  );
  const policyOut = readRequiredAdbText(
    adbBin,
    serial,
    ['shell', 'settings', 'get', 'global', 'policy_control'],
    options,
  );

  let physicalSize = null;
  let overrideSize = null;
  for (const line of sizeOut.split(/\r?\n/)) {
    if (line.includes('Physical size:')) {
      physicalSize = parseSizePair(line);
    } else if (line.includes('Override size:')) {
      overrideSize = parseSizePair(line);
    }
  }
  const effectiveSize = overrideSize || physicalSize || { width: 0, height: 0 };

  let physicalDensity = null;
  let overrideDensity = null;
  for (const line of densityOut.split(/\r?\n/)) {
    if (line.includes('Physical density:')) {
      physicalDensity = parseDensityValue(line);
    } else if (line.includes('Override density:')) {
      overrideDensity = parseDensityValue(line);
    }
  }
  if (!physicalSize || !physicalDensity)
    throw new Error('device-metrics-read-failed: incomplete physical size/density');
  const effectiveDensity = overrideDensity || physicalDensity;
  const fontScale = Number.parseFloat(fontOut) || 1.0;

  const logicalCanvas = {
    width: Math.round((effectiveSize.width * 160) / effectiveDensity),
    height: Math.round((effectiveSize.height * 160) / effectiveDensity),
  };

  let nativeWindowMetrics = null;
  const telemetryResult = runAdb(
    adbBin,
    serial,
    ['shell', 'run-as', 'vn.blue.mobile', 'cat', 'files/foundation-window-metrics.json'],
    metricReadOptions(options),
  );
  if (telemetryResult.status === 0) {
    try {
      nativeWindowMetrics = JSON.parse(telemetryResult.stdout);
    } catch {
      /* missing evidence remains null */
    }
  }
  const telemetryValid = validateNativeWindowTelemetry(nativeWindowMetrics, {
    width: effectiveSize.width,
    height: effectiveSize.height,
    density: effectiveDensity,
    fontScale,
  });
  const contentInsets = telemetryValid
    ? Object.fromEntries(
        Object.entries(nativeWindowMetrics.systemBarsInsetsPx).map(([key, value]) => [
          key,
          (value * 160) / effectiveDensity,
        ]),
      )
    : null;
  const systemBars = telemetryValid
    ? {
        immersiveFull:
          !nativeWindowMetrics.statusBarVisible && !nativeWindowMetrics.navigationBarVisible,
        statusBarVisible: nativeWindowMetrics.statusBarVisible,
        navigationBarVisible: nativeWindowMetrics.navigationBarVisible,
      }
    : null;

  return {
    serial,
    wmSizeRaw: sizeOut,
    wmDensityRaw: densityOut,
    physicalSize,
    overrideSize,
    effectiveSize,
    physicalDensity,
    overrideDensity,
    density: effectiveDensity,
    logicalCanvas,
    fontScale,
    fontScaleRaw: fontOut,
    policyControl: policyOut,
    systemBars,
    nativeWindowMetrics: telemetryValid ? nativeWindowMetrics : null,
    contentInsets,
  };
}

export function saveDeviceRecoveryState(adbBin, serial, recoveryPath) {
  let store = {};
  if (fs.existsSync(recoveryPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(recoveryPath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        store = parsed;
      }
    } catch {
      store = {};
    }
  }

  // If this exact serial has an unrecovered entry, restore it first before reading fresh baseline
  if (store[serial] || (store.serial && store.serial === serial)) {
    const recovered = restoreAndVerifyDeviceState(adbBin, serial, recoveryPath);
    if (!recovered.verified)
      throw new Error('device-recovery-failed: previous state remains unverified');
    store = {};
  }

  const metrics = readDeviceMetrics(adbBin, serial);
  const immersiveConfirmationsOut = readRequiredAdbText(adbBin, serial, [
    'shell',
    'settings',
    'get',
    'secure',
    'immersive_mode_confirmations',
  ]);
  const windowAnimOut = readRequiredAdbText(adbBin, serial, [
    'shell',
    'settings',
    'get',
    'global',
    'window_animation_scale',
  ]);
  const transitionAnimOut = readRequiredAdbText(adbBin, serial, [
    'shell',
    'settings',
    'get',
    'global',
    'transition_animation_scale',
  ]);
  const animatorDurationOut = readRequiredAdbText(adbBin, serial, [
    'shell',
    'settings',
    'get',
    'global',
    'animator_duration_scale',
  ]);

  store[serial] = {
    serial,
    capturedAt: new Date().toISOString(),
    physicalSize: metrics.physicalSize,
    overrideSize: metrics.overrideSize,
    physicalDensity: metrics.physicalDensity,
    overrideDensity: metrics.overrideDensity,
    fontScale: metrics.fontScale,
    fontScaleRaw: metrics.fontScaleRaw,
    policyControl: metrics.policyControl,
    immersiveConfirmations: immersiveConfirmationsOut,
    windowAnimationScale: windowAnimOut,
    transitionAnimationScale: transitionAnimOut,
    animatorDurationScale: animatorDurationOut,
    wmSizeRaw: metrics.wmSizeRaw,
    wmDensityRaw: metrics.wmDensityRaw,
  };
  fs.mkdirSync(path.dirname(recoveryPath), { recursive: true });
  fs.writeFileSync(recoveryPath, JSON.stringify(store, null, 2), 'utf8');

  // Disable window/transition animations during test execution so UIAutomator dump does not block on active animations
  runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'window_animation_scale', '0']);
  runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'transition_animation_scale', '0']);
  runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'animator_duration_scale', '0']);

  return store[serial];
}

export function restoreAndVerifyDeviceState(adbBin, serial, recoveryPath) {
  if (!fs.existsSync(recoveryPath)) {
    return { restored: false, verified: true, reason: 'no-recovery-file' };
  }
  let store = {};
  try {
    store = JSON.parse(fs.readFileSync(recoveryPath, 'utf8'));
  } catch {
    return { restored: false, verified: false, reason: 'corrupt-recovery-file' };
  }

  const saved = store[serial] || (store.serial === serial ? store : null);
  if (!saved || saved.serial !== serial) {
    // Never restore one device's saved settings onto another serial
    return { restored: false, verified: true, reason: 'different-serial-skipped' };
  }

  try {
    if (saved.overrideSize && saved.overrideSize.width && saved.overrideSize.height) {
      runAdb(adbBin, serial, [
        'shell',
        'wm',
        'size',
        `${saved.overrideSize.width}x${saved.overrideSize.height}`,
      ]);
    } else {
      runAdb(adbBin, serial, ['shell', 'wm', 'size', 'reset']);
    }

    if (saved.overrideDensity) {
      runAdb(adbBin, serial, ['shell', 'wm', 'density', String(saved.overrideDensity)]);
    } else {
      runAdb(adbBin, serial, ['shell', 'wm', 'density', 'reset']);
    }

    const restoreSetting = (namespace, key, value) => {
      const absent = value === 'null' || value === '' || value === null || value === undefined;
      return runAdb(adbBin, serial, [
        'shell',
        'settings',
        absent ? 'delete' : 'put',
        namespace,
        key,
        ...(absent ? [] : [String(value)]),
      ]);
    };
    restoreSetting('system', 'font_scale', saved.fontScaleRaw ?? String(saved.fontScale));
    restoreSetting('global', 'policy_control', saved.policyControl);
    restoreSetting('secure', 'immersive_mode_confirmations', saved.immersiveConfirmations);

    const targetWindowAnim =
      saved.windowAnimationScale !== undefined && saved.windowAnimationScale !== ''
        ? String(saved.windowAnimationScale)
        : '1';
    const targetTransitionAnim =
      saved.transitionAnimationScale !== undefined && saved.transitionAnimationScale !== ''
        ? String(saved.transitionAnimationScale)
        : '1';
    const targetAnimatorDur =
      saved.animatorDurationScale !== undefined && saved.animatorDurationScale !== ''
        ? String(saved.animatorDurationScale)
        : '1';

    runAdb(adbBin, serial, [
      'shell',
      'settings',
      'put',
      'global',
      'window_animation_scale',
      targetWindowAnim,
    ]);
    runAdb(adbBin, serial, [
      'shell',
      'settings',
      'put',
      'global',
      'transition_animation_scale',
      targetTransitionAnim,
    ]);
    runAdb(adbBin, serial, [
      'shell',
      'settings',
      'put',
      'global',
      'animator_duration_scale',
      targetAnimatorDur,
    ]);

    runAdb(adbBin, serial, [
      'shell',
      'am',
      'start',
      '-W',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      'bluemobile://debug/case/FOUNDATION-SMOKE?hideBars=0',
      'vn.blue.mobile',
    ]);

    sleepMs(400);
    const after = readDeviceMetrics(adbBin, serial);
    const expectedSize = saved.overrideSize || saved.physicalSize;
    const expectedDensity = saved.overrideDensity || saved.physicalDensity;
    const sizeMatches =
      !expectedSize ||
      (after.effectiveSize.width === expectedSize.width &&
        after.effectiveSize.height === expectedSize.height);
    const densityMatches = !expectedDensity || after.density === expectedDensity;
    const fontMatches = Math.abs(after.fontScale - Number(saved.fontScale || 1.0)) < 0.05;

    const currentWindowAnim = readRequiredAdbText(adbBin, serial, [
      'shell',
      'settings',
      'get',
      'global',
      'window_animation_scale',
    ]);
    const currentTransitionAnim = readRequiredAdbText(adbBin, serial, [
      'shell',
      'settings',
      'get',
      'global',
      'transition_animation_scale',
    ]);
    const currentAnimatorDur = readRequiredAdbText(adbBin, serial, [
      'shell',
      'settings',
      'get',
      'global',
      'animator_duration_scale',
    ]);

    const readSetting = (namespace, key) =>
      (runAdb(adbBin, serial, ['shell', 'settings', 'get', namespace, key]).stdout || '').trim();
    const normalizeAbsent = (value) =>
      value === '' || value === undefined || value === null ? 'null' : String(value);
    const policyMatches =
      normalizeAbsent(after.policyControl) === normalizeAbsent(saved.policyControl);
    const immersiveMatches =
      normalizeAbsent(readSetting('secure', 'immersive_mode_confirmations')) ===
      normalizeAbsent(saved.immersiveConfirmations);
    const rawFontMatches =
      saved.fontScaleRaw === undefined ||
      normalizeAbsent(after.fontScaleRaw) === normalizeAbsent(saved.fontScaleRaw);
    const animMatches =
      (!saved.windowAnimationScale || currentWindowAnim === targetWindowAnim) &&
      (!saved.transitionAnimationScale || currentTransitionAnim === targetTransitionAnim) &&
      (!saved.animatorDurationScale || currentAnimatorDur === targetAnimatorDur);

    const verified =
      sizeMatches &&
      densityMatches &&
      fontMatches &&
      rawFontMatches &&
      policyMatches &&
      immersiveMatches &&
      animMatches;
    if (verified) {
      delete store[serial];
      if (store.serial === serial) {
        delete store.serial;
      }
      if (Object.keys(store).length === 0) {
        fs.unlinkSync(recoveryPath);
      } else {
        fs.writeFileSync(recoveryPath, JSON.stringify(store, null, 2), 'utf8');
      }
    }
    return {
      restored: true,
      verified,
      checks: {
        sizeMatches,
        densityMatches,
        fontMatches,
        rawFontMatches,
        policyMatches,
        immersiveMatches,
        animMatches,
      },
      restoredMetrics: {
        effectiveSize: after.effectiveSize,
        density: after.density,
        fontScale: after.fontScale,
        policyControl: after.policyControl,
        animationScales: {
          windowAnimationScale: currentWindowAnim,
          transitionAnimationScale: currentTransitionAnim,
          animatorDurationScale: currentAnimatorDur,
        },
      },
    };
  } catch (error) {
    return {
      restored: false,
      verified: false,
      reason: 'device-state-read-or-restore-failed',
      error: String(error),
    };
  }
}

export function applyDeviceProfile(adbBin, serial, profile) {
  // Ensure animations stay disabled across profile changes to prevent UIAutomator dump idle stalls
  runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'window_animation_scale', '0']);
  runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'transition_animation_scale', '0']);
  runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'animator_duration_scale', '0']);

  runAdb(adbBin, serial, ['shell', 'wm', 'size', `${profile.width}x${profile.height}`]);
  runAdb(adbBin, serial, ['shell', 'wm', 'density', String(profile.density)]);
  runAdb(adbBin, serial, [
    'shell',
    'settings',
    'put',
    'system',
    'font_scale',
    String(profile.fontScale),
  ]);
  if (profile.hideBars) {
    runAdb(adbBin, serial, [
      'shell',
      'settings',
      'put',
      'global',
      'policy_control',
      'immersive.full=*',
    ]);
    runAdb(adbBin, serial, [
      'shell',
      'settings',
      'put',
      'secure',
      'immersive_mode_confirmations',
      'confirmed',
    ]);
  } else {
    runAdb(adbBin, serial, ['shell', 'settings', 'put', 'global', 'policy_control', 'null']);
  }
  runAdb(adbBin, serial, ['reverse', 'tcp:8081', 'tcp:8081']);
  sleepMs(500);
}

export function parseUiAutomatorXml(xmlText, density = 160) {
  const nodes = [];
  const nodeRegex = /<node\s+([^>]+?)\/?>/g;
  let match;
  const scale = 160 / (density || 160);

  while ((match = nodeRegex.exec(xmlText)) !== null) {
    const attrText = match[1];
    const attrs = {};
    const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
    let aMatch;
    while ((aMatch = attrRegex.exec(attrText)) !== null) {
      attrs[aMatch[1]] = aMatch[2];
    }

    const boundsMatch = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(attrs.bounds || '');
    if (!boundsMatch) {
      continue;
    }
    const leftPx = Number(boundsMatch[1]);
    const topPx = Number(boundsMatch[2]);
    const rightPx = Number(boundsMatch[3]);
    const bottomPx = Number(boundsMatch[4]);

    const x = Math.round(leftPx * scale);
    const y = Math.round(topPx * scale);
    const width = Math.round((rightPx - leftPx) * scale);
    const height = Math.round((bottomPx - topPx) * scale);

    const rawId = attrs['resource-id'] || '';
    const normalizedId = rawId.includes(':id/') ? rawId.split(':id/')[1] : rawId;

    nodes.push({
      id: normalizedId,
      rawResourceId: rawId,
      text: attrs.text || '',
      contentDesc: attrs['content-desc'] || '',
      className: attrs.class || '',
      packageName: attrs.package || '',
      clickable: attrs.clickable === 'true',
      enabled: attrs.enabled === 'true',
      focusable: attrs.focusable === 'true',
      focused: attrs.focused === 'true',
      selected: attrs.selected === 'true',
      boundsPx: { left: leftPx, top: topPx, right: rightPx, bottom: bottomPx },
      x,
      y,
      width,
      height,
    });
  }

  return nodes;
}

export function dumpUiAutomatorHierarchy(adbBin, serial, density = 160, options = {}) {
  const boundedTimeout = (requested) => {
    if (!options.deadlineAt) return requested;
    const remaining = options.deadlineAt - Date.now();
    if (remaining <= 0) throw new Error('layout-profile-deadline-exceeded');
    return Math.min(requested, remaining);
  };
  const timeout = boundedTimeout(options.timeout ?? 8000);
  const maxAttempts = options.maxAttempts ?? 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      runAdb(adbBin, serial, ['shell', 'pkill', '-9', '-f', 'uiautomator'], {
        timeout: boundedTimeout(3000),
      });
      sleepMs(300);
    }
    const dumpRes = runAdb(
      adbBin,
      serial,
      ['shell', 'rm -f /sdcard/window_dump.xml && uiautomator dump /sdcard/window_dump.xml'],
      { timeout },
    );
    if (dumpRes.timedOut || dumpRes.status === 124) {
      runAdb(adbBin, serial, ['shell', 'pkill', '-9', '-f', 'uiautomator'], {
        timeout: boundedTimeout(3000),
      });
      const diagMsg = `[dumpUiAutomatorHierarchy:timeout] UIAutomator dump timed out after ${timeout}ms on device ${serial} (attempt ${attempt + 1}/${maxAttempts}). Diagnostics: UI thread may not be idle or animations are running.`;
      console.error(diagMsg);
      throw new Error(diagMsg);
    }
    if (dumpRes.status !== 0 || !(dumpRes.stdout || '').includes('dumped to')) {
      runAdb(adbBin, serial, ['shell', 'pkill', '-9', '-f', 'uiautomator'], {
        timeout: boundedTimeout(3000),
      });
      sleepMs(300);
      continue;
    }
    const catRes = runAdb(adbBin, serial, ['shell', 'cat', '/sdcard/window_dump.xml'], {
      timeout: boundedTimeout(5000),
    });
    if (catRes.timedOut || catRes.status === 124) {
      const diagMsg = `[dumpUiAutomatorHierarchy:timeout] adb cat window_dump.xml timed out on device ${serial}`;
      console.error(diagMsg);
      throw new Error(diagMsg);
    }
    const xmlText = catRes.stdout || '';
    if (xmlText.includes('<hierarchy')) {
      return {
        xmlText,
        nodes: parseUiAutomatorXml(xmlText, density),
      };
    }
    sleepMs(300);
  }
  return { xmlText: '', nodes: [] };
}

export function readNativeOnLayoutTelemetry(adbBin, serial) {
  const res = runAdb(adbBin, serial, [
    'shell',
    'run-as',
    'vn.blue.mobile',
    'cat',
    'files/foundation-onlayout.json',
  ]);
  if (res.status !== 0 || !res.stdout) {
    return null;
  }
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

export function readNativeStorageProof(adbBin, serial, fileName = 'foundation-storage-proof.json') {
  const res = runAdb(adbBin, serial, [
    'shell',
    'run-as',
    'vn.blue.mobile',
    'cat',
    `files/${fileName}`,
  ]);
  if (res.status !== 0 || !res.stdout) {
    return null;
  }
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

export function buildHarnessCaseUriArg(caseId, hideBars = null, nativeFault = null) {
  const params = [];
  if (typeof hideBars === 'boolean') params.push(`hideBars=${hideBars ? '1' : '0'}`);
  if (nativeFault) params.push(`nativeFault=${encodeURIComponent(nativeFault)}`);
  return `'bluemobile://debug/case/${encodeURIComponent(caseId)}${params.length ? `?${params.join('&')}` : ''}'`;
}

export function launchCaseAndWaitForMount(
  adbBin,
  serial,
  caseId,
  density = 160,
  expectedWidth = null,
  hideBars = null,
  nativeFault = null,
) {
  runAdb(adbBin, serial, ['reverse', 'tcp:8081', 'tcp:8081']);

  const tryDismissDevMenu = (dump) => {
    if (
      dump.xmlText.includes('There was a problem loading the project') ||
      dump.xmlText.includes('problem loading the project')
    ) {
      const reloadNode = dump.nodes.find((n) => n.text === 'Reload');
      if (reloadNode) {
        const cx = Math.round((reloadNode.boundsPx.left + reloadNode.boundsPx.right) / 2);
        const cy = Math.round((reloadNode.boundsPx.top + reloadNode.boundsPx.bottom) / 2);
        runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
        sleepMs(600);
        return true;
      }
    }
    const gotItNode = dump.nodes.find(
      (n) => (n.text === 'Got it' || n.id === 'ok') && dump.xmlText.includes('Viewing full screen'),
    );
    if (gotItNode) {
      const cx = Math.round((gotItNode.boundsPx.left + gotItNode.boundsPx.right) / 2);
      const cy = Math.round((gotItNode.boundsPx.top + gotItNode.boundsPx.bottom) / 2);
      runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
      sleepMs(500);
      return true;
    }
    const continueNode = dump.nodes.find(
      (n) =>
        n.text === 'Continue' &&
        (dump.xmlText.includes('This is the developer menu') || dump.xmlText.includes('dev menu')),
    );
    if (continueNode) {
      const cx = Math.round((continueNode.boundsPx.left + continueNode.boundsPx.right) / 2);
      const cy = Math.round((continueNode.boundsPx.top + continueNode.boundsPx.bottom) / 2);
      runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
      sleepMs(500);
      return true;
    }
    const anrNode = dump.nodes.find(
      (n) =>
        (n.id === 'aerr_wait' ||
          n.text === 'Wait' ||
          n.id === 'aerr_close' ||
          n.text === 'Close app') &&
        (dump.xmlText.includes("isn't responding") || dump.xmlText.includes('is not responding')),
    );
    if (anrNode) {
      const cx = Math.round((anrNode.boundsPx.left + anrNode.boundsPx.right) / 2);
      const cy = Math.round((anrNode.boundsPx.top + anrNode.boundsPx.bottom) / 2);
      runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
      sleepMs(500);
      return true;
    }
    const closeNode = dump.nodes.find(
      (n) => n.contentDesc === 'Close' && dump.xmlText.includes('Expo Go'),
    );
    if (closeNode) {
      const cx = Math.round((closeNode.boundsPx.left + closeNode.boundsPx.right) / 2);
      const cy = Math.round((closeNode.boundsPx.top + closeNode.boundsPx.bottom) / 2);
      runAdb(adbBin, serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
      sleepMs(500);
      return true;
    }
    return false;
  };

  // First check if the JS bundle is already mounted; if so, deep-link directly to the case
  let currentDump = { xmlText: '', nodes: [] };
  try {
    currentDump = dumpUiAutomatorHierarchy(adbBin, serial, density);
  } catch (error) {
    if (!String(error).includes('[dumpUiAutomatorHierarchy:timeout]')) throw error;
    // A disconnected dev-client spinner may never become idle. Reconnect to the
    // verified Metro below instead of treating the pre-launch tree as app evidence.
  }
  tryDismissDevMenu(currentDump);
  const isErrorScreen = currentDump.xmlText.includes('problem loading the project');
  const alreadyHasBundle =
    !isErrorScreen && currentDump.nodes.some((n) => n.id.startsWith('screen.'));

  if (!alreadyHasBundle) {
    if (isErrorScreen) {
      runAdb(adbBin, serial, ['shell', 'am', 'force-stop', 'vn.blue.mobile']);
      sleepMs(400);
      runAdb(adbBin, serial, ['reverse', 'tcp:8081', 'tcp:8081']);
    }
    runAdb(adbBin, serial, [
      'shell',
      'am',
      'start',
      '-W',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `bluemobile://expo-development-client/?url=${encodeURIComponent('http://127.0.0.1:8081')}`,
      'vn.blue.mobile',
    ]);
    for (let poll = 0; poll < 35; poll += 1) {
      sleepMs(600);
      try {
        currentDump = dumpUiAutomatorHierarchy(adbBin, serial, density);
      } catch (error) {
        if (String(error).includes('[dumpUiAutomatorHierarchy:timeout]')) continue;
        throw error;
      }
      if (tryDismissDevMenu(currentDump)) {
        continue;
      }
      if (currentDump.nodes.some((n) => n.id.startsWith('screen.'))) {
        break;
      }
    }
  }

  // Deep-link to the target caseId to reset scenario state cleanly
  runAdb(adbBin, serial, [
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    buildHarnessCaseUriArg(caseId, hideBars, nativeFault),
    'vn.blue.mobile',
  ]);

  let lastDump = currentDump;
  for (let poll = 0; poll < 25; poll += 1) {
    sleepMs(400);
    lastDump = dumpUiAutomatorHierarchy(adbBin, serial, density);
    if (tryDismissDevMenu(lastDump)) {
      continue;
    }
    const screenNode = lastDump.nodes.find((n) => n.id === `screen.${caseId}`);
    const anchorNode =
      caseId === 'FOUNDATION-SMOKE'
        ? lastDump.nodes.find((n) => n.id === 'foundation.anchor')
        : lastDump.nodes.find((n) => n.id && n.id !== `screen.${caseId}`);
    if (screenNode && anchorNode) {
      if (!expectedWidth || Math.abs(screenNode.width - expectedWidth) <= 4) {
        return lastDump;
      }
    }
  }
  return lastDump;
}

export function checkMetroStatus(port = 8081) {
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

export function killProcessTreeOnWindows(pid) {
  if (!pid) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // Ignore if already exited
  }
}

export async function ensureMobileMetroRunning(rootDir, port = 8081) {
  const status = await checkMetroStatus(port);
  if (
    status.running &&
    status.projectRoot &&
    path.resolve(status.projectRoot).toLowerCase() !== rootDir.toLowerCase()
  ) {
    throw new Error(
      `wrong-metro-root: Port ${port} is occupied by Metro for ${status.projectRoot}, expected ${rootDir}`,
    );
  }
  if (status.running) {
    return { spawnedMetro: null, stopMetro: () => undefined };
  }

  const pidFile = path.join(rootDir, 'artifacts', '.metro-runner.pid');
  const resumeDir = path.join(rootDir, 'artifacts', 'agy', 'plan01', 'task02', 'resume-02');
  const logFile = path.join(resumeDir, 'metro.log');
  const resumePidFile = path.join(resumeDir, 'metro.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  fs.mkdirSync(resumeDir, { recursive: true });

  let logFd = 'ignore';
  try {
    logFd = fs.openSync(logFile, 'a');
  } catch {
    logFd = 'ignore';
  }
  const expoCli = path.join(rootDir, 'node_modules', 'expo', 'bin', 'cli');
  const spawnedMetro = spawn(
    process.execPath,
    [expoCli, 'start', '--dev-client', '--port', String(port)],
    {
      cwd: rootDir,
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

  return {
    spawnedMetro,
    stopMetro: () => {
      if (spawnedMetro && spawnedMetro.pid) {
        killProcessTreeOnWindows(spawnedMetro.pid);
        if (fs.existsSync(pidFile)) {
          fs.unlinkSync(pidFile);
        }
      }
    },
  };
}

// --- Pure Node PNG Parser & Renderer for Visual Overlay & Diff ---
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function readPngHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG buffer');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  return { width, height, bitDepth, colorType };
}

export function decodePngRgba(buf) {
  const { width, height, colorType } = readPngHeader(buf);
  const idatParts = [];
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const raw = zlib.inflateSync(Buffer.concat(idatParts));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const stride = width * bpp;
  const rgba = Buffer.alloc(width * height * 4);
  const prevRow = Buffer.alloc(stride);
  const curRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filterType = raw[rowStart];
    for (let i = 0; i < stride; i += 1) {
      const rawByte = raw[rowStart + 1 + i];
      const a = i >= bpp ? curRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      let recon = rawByte;
      if (filterType === 1) recon = (rawByte + a) & 0xff;
      else if (filterType === 2) recon = (rawByte + b) & 0xff;
      else if (filterType === 3) recon = (rawByte + ((a + b) >> 1)) & 0xff;
      else if (filterType === 4) recon = (rawByte + paethPredictor(a, b, c)) & 0xff;
      curRow[i] = recon;
    }
    curRow.copy(prevRow);

    for (let x = 0; x < width; x += 1) {
      const dstIdx = (y * width + x) * 4;
      const srcIdx = x * bpp;
      rgba[dstIdx] = curRow[srcIdx];
      rgba[dstIdx + 1] = curRow[srcIdx + 1];
      rgba[dstIdx + 2] = curRow[srcIdx + 2];
      rgba[dstIdx + 3] = bpp === 4 ? curRow[srcIdx + 3] : 255;
    }
  }

  return { width, height, rgba };
}

export function encodePngRgba(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // Filter type 0 (None)
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function drawRectOutline(rgba, imgWidth, imgHeight, box, colorRgba, thickness = 2) {
  const x0 = Math.max(0, Math.round(box.x));
  const y0 = Math.max(0, Math.round(box.y));
  const x1 = Math.min(imgWidth - 1, Math.round(box.x + box.width - 1));
  const y1 = Math.min(imgHeight - 1, Math.round(box.y + box.height - 1));

  const setPixel = (px, py) => {
    if (px < 0 || px >= imgWidth || py < 0 || py >= imgHeight) return;
    const idx = (py * imgWidth + px) * 4;
    rgba[idx] = colorRgba[0];
    rgba[idx + 1] = colorRgba[1];
    rgba[idx + 2] = colorRgba[2];
    rgba[idx + 3] = colorRgba[3];
  };

  for (let t = 0; t < thickness; t += 1) {
    for (let x = x0; x <= x1; x += 1) {
      setPixel(x, y0 + t);
      setPixel(x, y1 - t);
    }
    for (let y = y0; y <= y1; y += 1) {
      setPixel(x0 + t, y);
      setPixel(x1 - t, y);
    }
  }
}

export function detectHierarchyOverlayContamination(
  nodes = [],
  caseId = 'FOUNDATION-SMOKE',
  options = {},
) {
  const allowedFoundationIds = new Set([
    'action_bar_root',
    'content',
    'screen.FOUNDATION-SMOKE',
    'foundation.anchor',
    'foundation.logo',
    'foundation.status',
    'foundation.toggle',
  ]);
  const allowedFoundationTexts = new Set(['', 'Sẵn sàng', 'Đã chạm', 'Kiểm tra']);
  const allowedFoundationContentDescs = new Set([
    '',
    'Khung chuẩn hiệu chỉnh 100 nhân 50',
    'Logo chính thức BLUE',
    'Sẵn sàng',
    'Đã chạm',
    'Kiểm tra',
  ]);

  const unexpected = [];
  for (const node of nodes) {
    const pkg = node.packageName || '';
    const cls = node.className || '';
    const text = node.text || '';
    const desc = node.contentDesc || '';
    const id = node.id || '';

    const isForeignPackage = Boolean(pkg) && pkg !== 'vn.blue.mobile';
    const isComposeOverlay = cls.includes('ComposeView');
    const isToolsOverlay =
      text === 'Tools' ||
      desc === 'Tools' ||
      text.toLowerCase().includes('developer menu') ||
      desc.toLowerCase().includes('developer menu');
    const isForbiddenId =
      Boolean(id) &&
      Boolean(
        options?.forbiddenTestIds?.has
          ? options.forbiddenTestIds.has(id)
          : Array.isArray(options?.forbiddenTestIds) && options.forbiddenTestIds.includes(id),
      );

    let isContamination = isForeignPackage || isComposeOverlay || isToolsOverlay || isForbiddenId;

    if (!isContamination && caseId === 'FOUNDATION-SMOKE') {
      const isUnknownId = Boolean(id) && !allowedFoundationIds.has(id);
      const isUnknownContent =
        !allowedFoundationTexts.has(text) || !allowedFoundationContentDescs.has(desc);
      if (isUnknownId || isUnknownContent) {
        isContamination = true;
      }
    }

    if (isContamination) {
      unexpected.push({
        id,
        packageName: pkg,
        className: cls,
        text,
        contentDesc: desc,
        bounds: { x: node.x, y: node.y, width: node.width, height: node.height },
      });
    }
  }
  return unexpected;
}

export function detectCanvasPixelContamination(
  rgba,
  width,
  height,
  declaredBoxes = [],
  anchorBox = null,
  logoBox = null,
  options = {},
) {
  let bgR = 249;
  let bgG = 250;
  let bgB = 251;
  const bgTolerance = typeof options?.bgTolerance === 'number' ? options.bgTolerance : 10;

  if (typeof options?.bgR === 'number') {
    bgR = options.bgR;
    bgG = options.bgG ?? bgR;
    bgB = options.bgB ?? bgR;
  } else if (options?.caseId && options.caseId !== 'FOUNDATION-SMOKE' && rgba && rgba.length >= 4) {
    bgR = rgba[0];
    bgG = rgba[1];
    bgB = rgba[2];
  } else if (options?.caseId === 'FOUNDATION-SMOKE' || anchorBox) {
    bgR = 249;
    bgG = 250;
    bgB = 251;
  } else if (rgba && rgba.length >= 4) {
    bgR = rgba[0];
    bgG = rgba[1];
    bgB = rgba[2];
  }

  const isInsideAnyBox = (px, py, boxes, pad = 2) => {
    for (const box of boxes) {
      if (!box) continue;
      if (
        px >= box.x - pad &&
        px <= box.x + box.width + pad &&
        py >= box.y - pad &&
        py <= box.y + box.height + pad
      ) {
        return true;
      }
    }
    return false;
  };

  let outsideContaminatedPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let sampleRgb = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isInsideAnyBox(x, y, declaredBoxes, 2)) {
        continue;
      }
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      if (
        Math.abs(r - bgR) > bgTolerance ||
        Math.abs(g - bgG) > bgTolerance ||
        Math.abs(b - bgB) > bgTolerance
      ) {
        outsideContaminatedPixels += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (!sampleRgb) {
          sampleRgb = [r, g, b];
        }
      }
    }
  }

  let anchorObstructedPixels = 0;
  let anchorSampleRgb = null;
  if (anchorBox) {
    // Check top border (y = anchorBox.y) and upper interior strip (y = anchorBox.y + 1 .. logoBox.y - 2)
    // where status bar clock/icons would overlap if system bars were not genuinely hidden.
    // Border is #D0D5DD (208, 213, 221) and fill is #F0F4FA (240, 244, 250); pure white clock is (255, 255, 255).
    const topStripEndY = logoBox ? Math.max(anchorBox.y + 2, logoBox.y - 2) : anchorBox.y + 8;
    for (let y = anchorBox.y; y <= topStripEndY && y < height; y += 1) {
      for (let x = anchorBox.x + 1; x < anchorBox.x + anchorBox.width - 1 && x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const r = rgba[idx];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        const isBorder = Math.abs(r - 208) <= 8 && Math.abs(g - 213) <= 8 && Math.abs(b - 221) <= 8;
        const isFill = Math.abs(r - 240) <= 6 && Math.abs(g - 244) <= 6 && Math.abs(b - 250) <= 6;
        const isBorderFillBlend =
          r >= 200 && r <= 246 && g >= 205 && g <= 250 && b >= 213 && b <= 255;
        if (!isBorder && !isFill && !isBorderFillBlend) {
          anchorObstructedPixels += 1;
          if (!anchorSampleRgb) {
            anchorSampleRgb = { x, y, rgb: [r, g, b] };
          }
        }
      }
    }
  }

  return {
    outsideContaminatedPixels,
    outsideBounds:
      outsideContaminatedPixels > 0
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : null,
    outsideSampleRgb: sampleRgb,
    anchorObstructedPixels,
    anchorObstructionSample: anchorSampleRgb,
  };
}

export function deriveObservableAndroidRole(uiNode) {
  const cls = uiNode?.className || uiNode?.nativeClassName || '';
  if (cls === 'android.widget.Button') {
    return 'button';
  }
  if (cls === 'android.widget.ImageView') {
    return 'image';
  }
  if (cls === 'android.widget.TextView') {
    return 'text';
  }
  if (cls === 'android.view.View' || cls === 'android.view.ViewGroup') {
    return 'view';
  }
  return 'unknown';
}

export function queryAndroidAccessibilityServiceState(adbBin, serial) {
  const enabledOut = readRequiredAdbText(adbBin, serial, [
    'shell',
    'settings',
    'get',
    'secure',
    'accessibility_enabled',
  ]);
  const servicesOut = readRequiredAdbText(adbBin, serial, [
    'shell',
    'settings',
    'get',
    'secure',
    'enabled_accessibility_services',
  ]);
  const talkBackEnabled =
    enabledOut === '1' && /talkback/i.test(servicesOut) && servicesOut !== 'null';
  const packagesOut = runAdb(adbBin, serial, ['shell', 'pm', 'list', 'packages']).stdout || '';
  const talkBackPackages = packagesOut
    .split(/\r?\n/)
    .map((line) => line.replace(/^package:/, '').trim())
    .filter((pkg) => /talkback|marvin/i.test(pkg));
  return {
    accessibilityEnabled: enabledOut === '1',
    enabledAccessibilityServices: servicesOut && servicesOut !== 'null' ? servicesOut : null,
    talkBackInstalled: talkBackPackages.length > 0,
    talkBackPackages,
    talkBackServiceEnabled: talkBackEnabled,
  };
}

/**
 * Measures actual system-bar visibility from the window manager's inset state rather than
 * inferring it from the requested profile. Returns statusBarVisible / navigationBarVisible as
 * booleans when the dumpsys output exposes InsetsSource visibility, otherwise null (unknown).
 */
export function parseSystemBarVisibility(dumpsysText = '') {
  const readVisible = (typeName) => {
    const re = new RegExp(`InsetsSource[^\\n]*type=${typeName}[^\\n]*visible=(true|false)`, 'g');
    const values = [];
    let m;
    while ((m = re.exec(dumpsysText)) !== null) {
      values.push(m[1] === 'true');
    }
    if (values.length === 0) {
      return null;
    }
    return values.some(Boolean);
  };
  return {
    statusBarVisible: readVisible('statusBars'),
    navigationBarVisible: readVisible('navigationBars'),
  };
}

export function measureSystemBarVisibility(adbBin, serial) {
  const out = runAdb(adbBin, serial, ['shell', 'dumpsys', 'window', 'windows']).stdout || '';
  const focusLine = /mCurrentFocus=([^\r\n]*)/.exec(out)?.[1]?.trim() ?? null;
  const parsed = parseSystemBarVisibility(extractFocusedWindowInsets(out));
  return {
    ...parsed,
    currentFocus: focusLine,
    source: 'dumpsys window windows (focused window InsetsState)',
  };
}

function extractFocusedWindowInsets(dumpsysText) {
  // Prefer the InsetsState block of the vn.blue.mobile window; fall back to full text.
  const idx = dumpsysText.indexOf('vn.blue.mobile/vn.blue.mobile.MainActivity');
  if (idx < 0) {
    return dumpsysText;
  }
  const next = dumpsysText.indexOf('Window #', idx + 1);
  return dumpsysText.slice(idx, next > idx ? next : undefined);
}

// Foundation's canonical white CTA label must contain full glyph rows, not merely
// native XML text whose raster was clipped after density/font reconfiguration.
export function evaluateFoundationToggleInk(decoded, bounds) {
  if (!bounds) return { valid: false, reason: 'missing-toggle-bounds' };
  let minX = Infinity,
    minY = Infinity,
    maxX = -1,
    maxY = -1,
    count = 0;
  const left = Math.max(0, Math.ceil(bounds.x + 4));
  const right = Math.min(decoded.width, Math.floor(bounds.x + bounds.width - 4));
  const top = Math.max(0, Math.ceil(bounds.y + 4));
  const bottom = Math.min(decoded.height, Math.floor(bounds.y + bounds.height - 4));
  for (let y = top; y < bottom; y += 1)
    for (let x = left; x < right; x += 1) {
      const i = (y * decoded.width + x) * 4;
      if (decoded.rgba[i] > 180 && decoded.rgba[i + 1] > 180 && decoded.rgba[i + 2] > 180) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count += 1;
      }
    }
  const width = maxX < 0 ? 0 : maxX - minX + 1;
  const height = maxY < 0 ? 0 : maxY - minY + 1;
  return { valid: width >= 35 && height >= 9 && count >= 60, width, height, count };
}
