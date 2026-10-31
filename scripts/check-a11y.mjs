import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOnlineAdbDevices, loadMatrixCases } from './run-case.mjs';
import {
  applyDeviceProfile,
  deriveObservableAndroidRole,
  dumpUiAutomatorHierarchy,
  ensureMobileMetroRunning,
  launchCaseAndWaitForMount,
  queryAndroidAccessibilityServiceState,
  readDeviceMetrics,
  restoreAndVerifyDeviceState,
  runAdb,
  saveDeviceRecoveryState,
  sleepMs,
} from './native-device-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const MIN_TOUCH_TARGET_DP = 48;

export function evaluateA11yFixture(fixture) {
  const findings = [];
  if (!fixture || !Array.isArray(fixture.nodes) || fixture.nodes.length === 0) {
    return {
      verdict: 'FAIL',
      findings: [
        { severity: 'Critical', code: 'empty-a11y-tree', message: 'No a11y nodes provided' },
      ],
    };
  }

  if (fixture.talkBackVerified === true && fixture.talkBackServiceEnabled !== true) {
    findings.push({
      severity: 'Critical',
      code: 'unsubstantiated-talkback-claim',
      message:
        'talkBackVerified cannot be true when Android TalkBack service is not enabled and verified on device',
    });
  }

  if (fixture.keyboardFocusVerified !== true) {
    findings.push({
      severity: 'Important',
      code: 'missing-keyboard-focus-evidence',
      message:
        'Truthful keyboard/UIAutomator focus verification (keyboardFocusVerified: true) is required',
    });
  } else {
    const focusedId = fixture.focusedNodeId;
    const focusedNode = fixture.nodes.find((n) => n.id === focusedId);
    if (!focusedId || !focusedNode || !focusedNode.interactive) {
      findings.push({
        severity: 'Important',
        code: 'invalid-keyboard-focus-target',
        focusedNodeId: focusedId ?? null,
        message: `KEYCODE_TAB focus must land on an interactive control, got "${String(focusedId ?? 'none')}"`,
      });
    }
  }

  if (fixture.stateTransitionVerified === false) {
    findings.push({
      severity: 'Important',
      code: 'missing-state-transition-evidence',
      message: 'Native tap did not produce the expected status change (Sẵn sàng -> Đã chạm)',
    });
  }

  for (const node of fixture.nodes) {
    if (node.interactive || node.meaningful) {
      if (
        typeof node.accessibilityLabel !== 'string' ||
        node.accessibilityLabel.trim().length === 0
      ) {
        findings.push({
          severity: 'Critical',
          code: 'missing-accessibility-label',
          id: node.id,
          message: `Node "${node.id}" is missing a non-empty accessibilityLabel`,
        });
      }

      const roleValue = node.observableRole ?? node.accessibilityRole;
      if (typeof roleValue !== 'string' || roleValue.trim().length === 0) {
        findings.push({
          severity: 'Critical',
          code: 'missing-accessibility-role',
          id: node.id,
          message: `Node "${node.id}" is missing observableRole/accessibilityRole`,
        });
      }

      if (node.nativeClassName) {
        const expectedObservable = deriveObservableAndroidRole(node);
        if (node.observableRole && node.observableRole !== expectedObservable) {
          findings.push({
            severity: 'Critical',
            code: 'fabricated-observable-role',
            id: node.id,
            nativeClassName: node.nativeClassName,
            claimedRole: node.observableRole,
            expectedObservableRole: expectedObservable,
            message: `Node "${node.id}" claims observableRole="${node.observableRole}" which is not proven by nativeClassName="${node.nativeClassName}" (observable="${expectedObservable}")`,
          });
        }
      }
    }

    if (node.interactive) {
      const roleValue = node.observableRole ?? node.accessibilityRole;
      if (roleValue !== 'button') {
        findings.push({
          severity: 'Critical',
          code: 'invalid-interactive-role',
          id: node.id,
          role: roleValue,
          message: `Interactive node "${node.id}" must expose observable button role, got "${String(roleValue)}"`,
        });
      }
      const width = Number(node.width ?? 0);
      const height = Number(node.height ?? 0);
      if (width < MIN_TOUCH_TARGET_DP || height < MIN_TOUCH_TARGET_DP) {
        findings.push({
          severity: 'Important',
          code: 'touch-target-too-small',
          id: node.id,
          bounds: { width, height },
          message: `Interactive node "${node.id}" touch target (${width}x${height}dp) is smaller than ${MIN_TOUCH_TARGET_DP}x${MIN_TOUCH_TARGET_DP}dp`,
        });
      }
    }
  }

  return {
    verdict: findings.length === 0 ? 'PASS' : 'FAIL',
    findings,
  };
}

async function measureNativeA11y(caseId, caseDir, nativeFault = null) {
  const { adbBin, devices, error } = getOnlineAdbDevices();
  if (error || devices.length === 0) {
    console.error(
      `[check-a11y] FAIL (blocked-missing-device): No online Android device found. ${error ?? ''}`.trim(),
    );
    process.exit(2);
  }

  const serial = devices[0];
  const recoveryPath = path.join(ROOT_DIR, 'artifacts', '.device-recovery.json');
  saveDeviceRecoveryState(adbBin, serial, recoveryPath);
  const geomPath = path.join(caseDir, 'geometry.json');
  const geometry = fs.existsSync(geomPath) ? JSON.parse(fs.readFileSync(geomPath, 'utf8')) : {};
  let metro = null;

  let restoreResult = null;
  let initialDump = null;
  let postFocusDump = null;
  let postTapDump = null;
  let serviceState = null;
  const focusSequence = [];

  try {
    metro = await ensureMobileMetroRunning(ROOT_DIR, 8081);
    serviceState = queryAndroidAccessibilityServiceState(adbBin, serial);
    applyDeviceProfile(adbBin, serial, {
      width: 390,
      height: 844,
      density: 160,
      fontScale: '1.0',
      hideBars: true,
    });
    const metrics = readDeviceMetrics(adbBin, serial);
    initialDump = launchCaseAndWaitForMount(
      adbBin,
      serial,
      caseId,
      metrics.density,
      390,
      true,
      nativeFault,
    );
    fs.writeFileSync(path.join(caseDir, 'a11y-dump-initial.xml'), initialDump.xmlText, 'utf8');

    // Perform native hardware keyboard focus navigation (KEYCODE_TAB = 61).
    // Record the exact focused resource-id after every TAB press so focus order is evidence,
    // not an assumption. The only focusable interactive control must receive focus first.
    for (let tabTry = 0; tabTry < 3; tabTry += 1) {
      runAdb(adbBin, serial, ['shell', 'input', 'keyevent', '61']);
      sleepMs(350);
      const dump = dumpUiAutomatorHierarchy(adbBin, serial, metrics.density);
      const focused = dump.nodes.find((n) => n.focused);
      focusSequence.push({
        tabPress: tabTry + 1,
        focusedId: focused ? focused.id || null : null,
        focusedClassName: focused ? focused.className : null,
        focusedContentDesc: focused ? focused.contentDesc : null,
      });
      if (!postFocusDump && focused && focused.id) {
        postFocusDump = dump;
      }
    }
    if (!postFocusDump) {
      postFocusDump = dumpUiAutomatorHierarchy(adbBin, serial, metrics.density);
    }
    fs.writeFileSync(path.join(caseDir, 'a11y-dump-focused.xml'), postFocusDump.xmlText, 'utf8');

    // Trigger toggle interaction via native tap on interactive target center and dump updated state announcement
    const toggleNode =
      initialDump.nodes.find((n) => n.id === 'foundation.toggle') ||
      initialDump.nodes.find((n) => n.id === 'auth.login.rememberCheckbox') ||
      initialDump.nodes.find((n) => n.clickable);
    if (toggleNode) {
      const centerX = Math.round((toggleNode.boundsPx.left + toggleNode.boundsPx.right) / 2);
      const centerY = Math.round((toggleNode.boundsPx.top + toggleNode.boundsPx.bottom) / 2);
      runAdb(adbBin, serial, ['shell', 'input', 'tap', String(centerX), String(centerY)]);
      sleepMs(500);
      postTapDump = dumpUiAutomatorHierarchy(adbBin, serial, metrics.density);
      fs.writeFileSync(path.join(caseDir, 'a11y-dump-post-tap.xml'), postTapDump.xmlText, 'utf8');
    }
  } finally {
    restoreResult = restoreAndVerifyDeviceState(adbBin, serial, recoveryPath);
    metro?.stopMetro();
  }

  const targetIds =
    caseId === 'FOUNDATION-SMOKE'
      ? [
          {
            id: 'foundation.anchor',
            interactive: false,
            meaningful: true,
            declaredReactNativeRole: 'summary',
            roleLimitationNote:
              'React Native accessibilityRole="summary" sets AccessibilityNodeInfo roleDescription extra which Android uiautomator dump XML does not serialize; observable XML class is android.view.View.',
          },
          {
            id: 'foundation.logo',
            interactive: false,
            meaningful: true,
            declaredReactNativeRole: 'image',
            roleLimitationNote: null,
          },
          {
            id: 'foundation.status',
            interactive: false,
            meaningful: true,
            declaredReactNativeRole: 'text',
            roleLimitationNote: null,
          },
          {
            id: 'foundation.toggle',
            interactive: true,
            meaningful: true,
            declaredReactNativeRole: 'button',
            roleLimitationNote: null,
          },
        ]
      : (geometry.interactiveTargets ?? []).map((t) => ({
          id: t.id,
          interactive: true,
          meaningful: true,
          declaredReactNativeRole: t.accessibilityRole ?? 'button',
          roleLimitationNote: null,
        }));

  const nodes = [];
  for (const spec of targetIds) {
    const rawNode = initialDump?.nodes.find((n) => n.id === spec.id);
    if (rawNode) {
      const observableRole = deriveObservableAndroidRole(rawNode);
      nodes.push({
        id: rawNode.id,
        interactive: spec.interactive,
        meaningful: spec.meaningful,
        nativeClassName: rawNode.className,
        observableRole,
        declaredReactNativeRole: spec.declaredReactNativeRole,
        roleLimitationNote: spec.roleLimitationNote,
        accessibilityLabel: rawNode.contentDesc || rawNode.text || '',
        text: rawNode.text || '',
        contentDesc: rawNode.contentDesc || '',
        clickable: rawNode.clickable,
        focusable: rawNode.focusable,
        focusedInitial: rawNode.focused,
        focusedAfterTab: Boolean(postFocusDump?.nodes.find((n) => n.id === rawNode.id)?.focused),
        enabled: rawNode.enabled,
        x: rawNode.x,
        y: rawNode.y,
        width: rawNode.width,
        height: rawNode.height,
      });
    }
  }

  const firstFocused = focusSequence.find((entry) => entry.focusedId) ?? null;
  const focusedNodeId = firstFocused?.focusedId ?? null;
  const initialStatus = initialDump?.nodes.find((n) => n.id === 'foundation.status');
  const postTapStatus = postTapDump?.nodes.find((n) => n.id === 'foundation.status');
  const keyboardFocusVerified =
    focusSequence.length > 0 &&
    Boolean(focusSequence[0].focusedId) &&
    nodes.some((n) => n.id === focusSequence[0].focusedId);
  // Separate state-change evidence from the native tap (not an assistive-technology claim).
  const stateTransitionVerified =
    caseId === 'FOUNDATION-SMOKE'
      ? (initialStatus?.text === 'Sẵn sàng' || initialStatus?.contentDesc === 'Sẵn sàng') &&
        (postTapStatus?.text === 'Đã chạm' || postTapStatus?.contentDesc === 'Đã chạm')
      : Boolean(postTapDump);

  const talkBackInstalled = Boolean(serviceState?.talkBackInstalled);
  const talkBackServiceEnabled = Boolean(serviceState?.talkBackServiceEnabled);
  const talkBackLimitationNote = !talkBackInstalled
    ? 'No TalkBack package is installed on this emulator image (measured via `pm list packages`); TalkBack traversal/announcement was NOT verified. Evidence is limited to UIAutomator AccessibilityNodeInfo properties, KEYCODE_TAB keyboard focus, and the native tap state change.'
    : talkBackServiceEnabled
      ? 'TalkBack service is enabled but this runner does not record TalkBack traversal/announcements; TalkBack verification is NOT claimed.'
      : 'TalkBack is installed but not enabled; the runner does not alter global accessibility settings, so TalkBack traversal/announcement was NOT verified.';

  if (!restoreResult?.verified)
    throw new Error('device-restore-verification-failed: recovery manifest retained');

  return {
    caseId,
    measuredAt: new Date().toISOString(),
    serial,
    talkBackInstalled,
    talkBackPackages: serviceState?.talkBackPackages ?? [],
    talkBackServiceEnabled,
    talkBackVerified: false,
    keyboardFocusVerified,
    focusedNodeId,
    focusSequence,
    stateTransitionVerified,
    assistiveJourneyEvidence: {
      method:
        'Android UIAutomator AccessibilityNodeInfo hierarchy dump + KEYCODE_TAB hardware keyboard focus sequence + native tap state transition',
      talkBackStatus: talkBackServiceEnabled
        ? 'service-enabled-but-traversal-not-recorded'
        : talkBackInstalled
          ? 'installed-not-enabled'
          : 'not-installed-on-device',
      talkBackLimitationNote,
      enabledAccessibilityServices: serviceState?.enabledAccessibilityServices ?? null,
      focusedNodeAfterKeycodeTab: focusedNodeId,
      focusSequence,
      initialStatusAnnouncement: initialStatus?.contentDesc || initialStatus?.text || null,
      postTapStatusAnnouncement: postTapStatus?.contentDesc || postTapStatus?.text || null,
      announcementNote:
        'Values are the status node contentDesc/text read from UIAutomator before and after the tap; they are not TalkBack speech output.',
      readingOrder: nodes.map((n) => ({
        id: n.id,
        nativeClassName: n.nativeClassName,
        observableRole: n.observableRole,
        label: n.accessibilityLabel,
        focusable: n.focusable,
        focusedAfterTab: n.focusedAfterTab,
        bounds: { x: n.x, y: n.y, width: n.width, height: n.height },
      })),
      xmlArtifacts: ['a11y-dump-initial.xml', 'a11y-dump-focused.xml', 'a11y-dump-post-tap.xml'],
    },
    restoredState: restoreResult,
    nodes,
  };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const fixtureFlagIdx = args.indexOf('--fixture');

  if (fixtureFlagIdx >= 0) {
    const fixturePath = path.resolve(args[fixtureFlagIdx + 1] ?? '');
    if (!fs.existsSync(fixturePath)) {
      console.error(`[check-a11y] FAIL: Missing fixture file ${fixturePath}`);
      process.exit(1);
    }
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const report = evaluateA11yFixture(fixture);
    if (report.verdict !== 'PASS') {
      console.error(`[check-a11y] FAIL:`, JSON.stringify(report, null, 2));
      process.exit(1);
    }
    console.log(`[check-a11y] PASS`);
    process.exit(0);
  }

  const caseId = args[0];
  if (!caseId) {
    console.error('[check-a11y] FAIL: Case ID is required');
    process.exit(1);
  }

  const cases = loadMatrixCases(ROOT_DIR);
  if (!cases.has(caseId)) {
    console.error(`[check-a11y] FAIL: Unknown case ID "${caseId}"`);
    process.exit(1);
  }

  const caseDir = path.join(ROOT_DIR, 'artifacts', caseId);
  fs.mkdirSync(caseDir, { recursive: true });
  const inputPath = path.join(caseDir, 'a11y-nodes.json');
  const skipMeasure = args.includes('--from-existing');

  let fixture;
  if (skipMeasure && fs.existsSync(inputPath)) {
    fixture = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    fixture = await measureNativeA11y(
      caseId,
      caseDir,
      args.includes('--native-fault') ? args[args.indexOf('--native-fault') + 1] : null,
    );
    fs.writeFileSync(inputPath, JSON.stringify(fixture, null, 2), 'utf8');
  }

  if (args.includes('--fault-missing-label')) {
    const targetNode =
      fixture.nodes?.find((n) => n.id === 'foundation.toggle') ||
      fixture.nodes?.find((n) => n.interactive);
    if (targetNode) {
      targetNode.accessibilityLabel = '';
    }
  }

  if (args.includes('--fault-missing-focus')) {
    fixture.keyboardFocusVerified = false;
    fixture.focusedNodeId = null;
  }

  const evaluation = evaluateA11yFixture(fixture);
  const report = {
    caseId,
    evaluatedAt: new Date().toISOString(),
    minTouchTargetDp: MIN_TOUCH_TARGET_DP,
    talkBackInstalled: fixture.talkBackInstalled ?? null,
    talkBackServiceEnabled: fixture.talkBackServiceEnabled ?? false,
    talkBackVerified: fixture.talkBackVerified ?? false,
    keyboardFocusVerified: fixture.keyboardFocusVerified ?? false,
    focusedNodeId: fixture.focusedNodeId ?? null,
    focusSequence: fixture.focusSequence ?? [],
    stateTransitionVerified: fixture.stateTransitionVerified ?? null,
    assistiveJourneyEvidence: fixture.assistiveJourneyEvidence,
    restoredState: fixture.restoredState,
    nodes: fixture.nodes,
    ...evaluation,
  };
  fs.writeFileSync(path.join(caseDir, 'a11y-report.json'), JSON.stringify(report, null, 2), 'utf8');

  if (report.verdict !== 'PASS') {
    console.error(`[check-a11y] FAIL for ${caseId}:`, JSON.stringify(report.findings, null, 2));
    process.exit(1);
  }
  console.log(`[check-a11y] PASS for ${caseId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void main();
}
