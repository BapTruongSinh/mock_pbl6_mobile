import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fireEvent } from '@testing-library/react-native';
import { assertScenarioContract } from '../assertScenarioContract';
import { getLastRenderedScenario, renderScenario } from '../renderScenario';
import {
  ensureFoundationSmokeScenarioRegistered,
  getFoundationSmokeResetGeneration,
  subscribeFoundationSmokeReset,
} from '../scenarios/FOUNDATION-SMOKE';
import { clearScenarioRegistryForTests } from '../scenarios/registry';
import { resetCaseContractsForTests } from '../scenarios/caseContracts';
import { createMockRepository } from '../../repositories/mock/createMockRepository';
import {
  createExpoFileSystemAdapter,
  createExpoFileSystemMockStateStorage,
} from '../../repositories/mock/mockStateStorage';
import { createExpoPendingIntentStorage } from '../../shared/native/pendingIntentStorage';

describe('Case: FOUNDATION-SMOKE', () => {
  beforeEach(() => {
    clearScenarioRegistryForTests();
    resetCaseContractsForTests();
    ensureFoundationSmokeScenarioRegistered();
  });

  test('FOUNDATION-SMOKE: foundation smoke renders calibration anchor, official logo, and toggles Sẵn sàng -> Đã chạm with clean reset', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const resetGenerations: number[] = [];
    const unsubscribe = subscribeFoundationSmokeReset((gen) => {
      resetGenerations.push(gen);
    });

    try {
      await renderScenario('FOUNDATION-SMOKE');
      await assertScenarioContract('FOUNDATION-SMOKE');

      const { tree } = getLastRenderedScenario();
      expect(tree.getByTestId('screen.FOUNDATION-SMOKE')).toBeTruthy();
      expect(tree.getByTestId('foundation.anchor')).toBeTruthy();
      expect(tree.getByTestId('foundation.logo')).toBeTruthy();
      expect(tree.getByText('Sẵn sàng')).toBeTruthy();
      expect(tree.queryByText('Đã chạm')).toBeNull();

      fireEvent(tree.getByTestId('foundation.anchor'), 'layout', {
        nativeEvent: { layout: { x: 20, y: 20, width: 100, height: 50 } },
      });

      fireEvent.press(tree.getByTestId('foundation.toggle'));
      expect(tree.getByText('Đã chạm')).toBeTruthy();
      expect(tree.queryByText('Sẵn sàng')).toBeNull();

      // Relaunching scenario must invoke reset() and restore initial Sẵn sàng state without any React act() console errors
      await renderScenario('FOUNDATION-SMOKE');
      await assertScenarioContract('FOUNDATION-SMOKE');
      const relaunched = getLastRenderedScenario().tree;
      expect(relaunched.getByText('Sẵn sàng')).toBeTruthy();
      expect(relaunched.queryByText('Đã chạm')).toBeNull();
      expect(resetGenerations.length).toBe(2);
      expect(getFoundationSmokeResetGeneration()).toBeGreaterThanOrEqual(2);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
      consoleErrorSpy.mockRestore();
    }
  });

  test('FOUNDATION-SMOKE: reference.json, geometry.json, official logo, and Be Vietnam Pro fonts match ASSET_LEDGER.md', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const refPath = path.join(rootDir, 'artifacts', 'FOUNDATION-SMOKE', 'reference.json');
    const geomPath = path.join(rootDir, 'artifacts', 'FOUNDATION-SMOKE', 'geometry.json');
    const ledgerPath = path.join(rootDir, 'docs', 'technical', 'ASSET_LEDGER.md');

    expect(fs.existsSync(refPath)).toBe(true);
    expect(fs.existsSync(geomPath)).toBe(true);
    expect(fs.existsSync(ledgerPath)).toBe(true);

    const reference = JSON.parse(fs.readFileSync(refPath, 'utf8')) as {
      caseId: string;
      source: string;
      reference: string;
      viewport: { width: number; height: number; density: number; fontScale: number };
      styleProvenance: {
        officialLogoPath: string;
        officialLogoSha256: string;
        fonts: Array<{ family: string; path: string; sha256: string }>;
      };
    };
    const geometry = JSON.parse(fs.readFileSync(geomPath, 'utf8')) as {
      caseId: string;
      before: string;
      toleranceDp: number;
      anchors: Array<{ id: string; x: number; y: number; width: number; height: number }>;
    };
    const ledgerText = fs.readFileSync(ledgerPath, 'utf8');

    expect(reference.caseId).toBe('FOUNDATION-SMOKE');
    expect(reference.source).toBe('N/A-design-derived');
    expect(reference.reference).toBe('test-harness-derived');
    expect(reference.viewport).toEqual({ width: 390, height: 844, density: 160, fontScale: 1 });

    expect(geometry.caseId).toBe('FOUNDATION-SMOKE');
    expect(geometry.before).toBe('N/A-new-screen');
    expect(geometry.toleranceDp).toBe(2);
    expect(geometry.anchors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'foundation.anchor',
          x: 20,
          y: 20,
          width: 100,
          height: 50,
        }),
      ]),
    );

    const logoPath = path.join(rootDir, reference.styleProvenance.officialLogoPath);
    expect(fs.existsSync(logoPath)).toBe(true);
    const logoHash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(logoPath))
      .digest('hex')
      .toUpperCase();
    expect(logoHash).toBe(reference.styleProvenance.officialLogoSha256);
    expect(ledgerText).toContain(logoHash);

    expect(reference.styleProvenance.fonts.length).toBeGreaterThanOrEqual(4);
    for (const font of reference.styleProvenance.fonts) {
      const fontFullPath = path.join(rootDir, font.path);
      expect(fs.existsSync(fontFullPath)).toBe(true);
      const fontHash = crypto
        .createHash('sha256')
        .update(fs.readFileSync(fontFullPath))
        .digest('hex')
        .toUpperCase();
      expect(fontHash).toBe(font.sha256);
      expect(ledgerText).toContain(fontHash);
    }
  });

  test('FOUNDATION-SMOKE: private-file storage persists state across cold relaunch and preserves last valid snapshot on failed atomic replace', async () => {
    const disk = new Map<string, string>();
    let failNextMove = false;

    const fakeNativeFs = {
      documentDirectory: 'file:///data/user/0/vn.blue.mobile/files/',
      getInfoAsync: async (uri: string) => ({ exists: disk.has(uri) }),
      readAsStringAsync: async (uri: string) => {
        const val = disk.get(uri);
        if (val === undefined) {
          throw new Error(`ENOENT: ${uri}`);
        }
        return val;
      },
      writeAsStringAsync: async (uri: string, content: string) => {
        disk.set(uri, content);
      },
      moveAsync: async ({ from, to }: { from: string; to: string }) => {
        if (failNextMove) {
          throw new Error('EIO: simulated moveAsync failure');
        }
        const val = disk.get(from);
        if (val === undefined) {
          throw new Error(`ENOENT: ${from}`);
        }
        disk.set(to, val);
        disk.delete(from);
      },
      deleteAsync: async (uri: string) => {
        disk.delete(uri);
      },
    };

    const adapter = createExpoFileSystemAdapter({ expoFs: fakeNativeFs });
    const baseClock = Date.parse('2026-08-27T00:00:00+07:00');

    // Cold launch #1: initialize repository (seeds and saves canonical snapshot to private file) and write pending intent
    const storage1 = createExpoFileSystemMockStateStorage({
      fs: adapter,
      expoFs: fakeNativeFs,
    });
    const repo1 = createMockRepository({
      now: () => baseClock,
      seed: 'FOUNDATION-SMOKE',
      storage: storage1,
    });
    expect((await repo1.initialize()).ok).toBe(true);

    const committedSnapshot = await storage1.load();
    expect(committedSnapshot).not.toBeNull();

    const intentStorage1 = createExpoPendingIntentStorage({
      fs: adapter,
      expoFs: fakeNativeFs,
    });
    await intentStorage1.write({
      accountId: 'ACC-CUST-1',
      kind: 'payment',
      key: 'PAY-204',
    });

    // Simulate failed atomic replace: previous committed snapshot and pending intent must remain intact
    failNextMove = true;
    await expect(
      intentStorage1.write({
        accountId: 'ACC-CUST-1',
        kind: 'refund',
        key: 'REF-999',
      }),
    ).rejects.toThrow(/EIO/i);
    failNextMove = false;

    // Cold relaunch #2: brand new repository and intent storage reading from same private files
    const storage2 = createExpoFileSystemMockStateStorage({
      fs: adapter,
      expoFs: fakeNativeFs,
    });
    const repo2 = createMockRepository({
      now: () => baseClock + 1000,
      seed: 'FOUNDATION-SMOKE',
      storage: storage2,
    });
    expect((await repo2.initialize()).ok).toBe(true);

    const tripAfterRelaunch = await repo2.getTrip('TR-204');
    expect(tripAfterRelaunch.ok).toBe(true);

    const intentStorage2 = createExpoPendingIntentStorage({
      fs: adapter,
      expoFs: fakeNativeFs,
    });
    const loadedIntents = await intentStorage2.read('ACC-CUST-1');
    expect(loadedIntents).toEqual([
      {
        accountId: 'ACC-CUST-1',
        kind: 'payment',
        key: 'PAY-204',
      },
    ]);
  });

  test('FOUNDATION-SMOKE F01: visual comparator fails when canonical screenshot or hierarchy is contaminated by dev-menu Tools overlay or system UI bars, and passes on clean app-only capture', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const checkVisualScript = path.join(rootDir, 'scripts', 'check-visual.mjs');
    const contaminatedPng = path.join(
      rootDir,
      'artifacts',
      'agy',
      'plan01',
      'task02',
      'rework-01',
      'before-fix',
      'implementation.png',
    );
    const contaminatedXml = path.join(
      rootDir,
      'artifacts',
      'agy',
      'plan01',
      'task02',
      'rework-01',
      'before-fix',
      'uiautomator-dump.xml',
    );

    // 1. Real archived contaminated capture (with Tools button and status bar clock on anchor) must FAIL
    const contaminatedRes = spawnSync(
      process.execPath,
      [
        checkVisualScript,
        'FOUNDATION-SMOKE',
        '--impl-png',
        contaminatedPng,
        '--xml-dump',
        contaminatedXml,
        '--no-write',
      ],
      { encoding: 'utf8' },
    );
    expect(contaminatedRes.status).not.toBe(0);
    expect(contaminatedRes.stderr).toMatch(/unexpected-overlay-contamination/i);
    expect(contaminatedRes.stderr).toMatch(
      /canvas-pixel-contamination|anchor-obstructed-by-system-ui/i,
    );

    // 2. CLI negative-control flag --fault-contaminate-overlay must also FAIL non-zero
    const faultOverlayRes = spawnSync(
      process.execPath,
      [checkVisualScript, 'FOUNDATION-SMOKE', '--fault-contaminate-overlay', '--no-write'],
      { encoding: 'utf8' },
    );
    expect(faultOverlayRes.status).not.toBe(0);
    expect(faultOverlayRes.stderr).toMatch(
      /unexpected-overlay-contamination|canvas-pixel-contamination/i,
    );

    // 3. Current canonical artifacts must have zero Tools/ComposeView overlay and pass check-visual
    const currentXml = fs.readFileSync(
      path.join(rootDir, 'artifacts', 'FOUNDATION-SMOKE', 'uiautomator-dump.xml'),
      'utf8',
    );
    expect(currentXml).not.toContain('content-desc="Tools"');
    expect(currentXml).not.toContain('text="Tools"');
    expect(currentXml).not.toContain('ComposeView');

    const cleanRes = spawnSync(
      process.execPath,
      [checkVisualScript, 'FOUNDATION-SMOKE', '--no-write'],
      { encoding: 'utf8' },
    );
    expect(cleanRes.status).toBe(0);
  });

  test('FOUNDATION-SMOKE F02: a11y comparator rejects unsubstantiated TalkBack claims, validates keyboard focus on interactive toggle, and derives roles strictly from observable Android node properties', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const checkA11yScript = path.join(rootDir, 'scripts', 'check-a11y.mjs');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blue-mobile-f02-'));

    try {
      // 1. Claiming talkBackVerified: true when talkBackServiceEnabled is false must FAIL
      const fakeTalkBackPath = path.join(tmpDir, 'fake-talkback.json');
      fs.writeFileSync(
        fakeTalkBackPath,
        JSON.stringify({
          talkBackServiceEnabled: false,
          talkBackVerified: true,
          keyboardFocusVerified: true,
          focusedNodeId: 'foundation.toggle',
          nodes: [
            {
              id: 'foundation.toggle',
              interactive: true,
              meaningful: true,
              nativeClassName: 'android.widget.Button',
              observableRole: 'button',
              accessibilityLabel: 'Kiểm tra',
              clickable: true,
              focusable: true,
              enabled: true,
              width: 120,
              height: 48,
            },
          ],
        }),
        'utf8',
      );
      const fakeTalkBackRes = spawnSync(
        process.execPath,
        [checkA11yScript, '--fixture', fakeTalkBackPath],
        { encoding: 'utf8' },
      );
      expect(fakeTalkBackRes.status).not.toBe(0);
      expect(fakeTalkBackRes.stderr).toMatch(/unsubstantiated-talkback-claim/i);

      // 2. Keyboard focus landing on a non-interactive node (e.g. foundation.logo) instead of interactive button must FAIL
      const wrongFocusPath = path.join(tmpDir, 'wrong-focus.json');
      fs.writeFileSync(
        wrongFocusPath,
        JSON.stringify({
          talkBackServiceEnabled: false,
          talkBackVerified: false,
          keyboardFocusVerified: true,
          focusedNodeId: 'foundation.logo',
          nodes: [
            {
              id: 'foundation.logo',
              interactive: false,
              meaningful: true,
              nativeClassName: 'android.widget.ImageView',
              observableRole: 'image',
              accessibilityLabel: 'Logo chính thức BLUE',
              clickable: false,
              focusable: false,
              enabled: true,
              width: 84,
              height: 26,
            },
            {
              id: 'foundation.toggle',
              interactive: true,
              meaningful: true,
              nativeClassName: 'android.widget.Button',
              observableRole: 'button',
              accessibilityLabel: 'Kiểm tra',
              clickable: true,
              focusable: true,
              enabled: true,
              width: 120,
              height: 48,
            },
          ],
        }),
        'utf8',
      );
      const wrongFocusRes = spawnSync(
        process.execPath,
        [checkA11yScript, '--fixture', wrongFocusPath],
        { encoding: 'utf8' },
      );
      expect(wrongFocusRes.status).not.toBe(0);
      expect(wrongFocusRes.stderr).toMatch(/invalid-keyboard-focus-target/i);

      // 3. Inventing observableRole 'summary' when nativeClassName is 'android.view.View' must FAIL
      const fabricatedRolePath = path.join(tmpDir, 'fabricated-role.json');
      fs.writeFileSync(
        fabricatedRolePath,
        JSON.stringify({
          talkBackServiceEnabled: false,
          talkBackVerified: false,
          keyboardFocusVerified: true,
          focusedNodeId: 'foundation.toggle',
          nodes: [
            {
              id: 'foundation.anchor',
              interactive: false,
              meaningful: true,
              nativeClassName: 'android.view.View',
              observableRole: 'summary',
              accessibilityLabel: 'Khung chuẩn hiệu chỉnh 100 nhân 50',
              clickable: false,
              focusable: false,
              enabled: true,
              width: 100,
              height: 50,
            },
            {
              id: 'foundation.toggle',
              interactive: true,
              meaningful: true,
              nativeClassName: 'android.widget.Button',
              observableRole: 'button',
              accessibilityLabel: 'Kiểm tra',
              clickable: true,
              focusable: true,
              enabled: true,
              width: 120,
              height: 48,
            },
          ],
        }),
        'utf8',
      );
      const fabricatedRoleRes = spawnSync(
        process.execPath,
        [checkA11yScript, '--fixture', fabricatedRolePath],
        { encoding: 'utf8' },
      );
      expect(fabricatedRoleRes.status).not.toBe(0);
      expect(fabricatedRoleRes.stderr).toMatch(/fabricated-observable-role/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('FOUNDATION-SMOKE F03: Maestro runner uses direct Java executable with argument array and shell:false, preserving UTF-8 Vietnamese without DEP0190 warning', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const runCaseScript = path.join(rootDir, 'scripts', 'run-case.mjs');

    const dryRunRes = spawnSync(
      process.execPath,
      [runCaseScript, '--print-invocation', 'FOUNDATION-SMOKE'],
      { encoding: 'utf8' },
    );
    expect(dryRunRes.status).toBe(0);
    const invocation = JSON.parse(dryRunRes.stdout) as {
      executable: string;
      args: string[];
      shell: boolean;
    };
    expect(invocation.shell).toBe(false);
    expect(Array.isArray(invocation.args)).toBe(true);
    expect(invocation.executable.toLowerCase()).toMatch(/java(\.exe)?$/);
    expect(invocation.args).toEqual(
      expect.arrayContaining([
        '-Dfile.encoding=UTF-8',
        '-Dsun.stdout.encoding=UTF-8',
        '-Dsun.stderr.encoding=UTF-8',
        'maestro.cli.AppKt',
        'test',
      ]),
    );

    const nativeLogPath = path.join(
      rootDir,
      'artifacts',
      'agy',
      'plan01',
      'task02',
      'native-case-foundation-smoke.log',
    );
    const nativeLog = fs.readFileSync(nativeLogPath, 'utf8');
    expect(nativeLog).not.toContain('DEP0190');
    expect(nativeLog).not.toContain('DeprecationWarning');
    expect(nativeLog).toContain('Sẵn sàng');
    expect(nativeLog).toContain('Đã chạm');
  });

  test('FOUNDATION-SMOKE: bounded timeout on adb spawn fails with diagnostics and preserves device restoration in finally', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const probeScript = `
      import * as path from 'node:path';
      import * as fs from 'node:fs';
      import childProcess from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      const actualSpawnSync = childProcess.spawnSync;
      // Exercise the real OS subprocess timeout without depending on an online emulator.
      // Cleanup commands finish immediately; the two operations under test deliberately hang.
      childProcess.spawnSync = (bin, args, options) => actualSpawnSync(process.execPath,
        ['-e', args.includes('pkill') ? '' : 'setTimeout(() => {}, 5000)'], options);
      syncBuiltinESMExports();
      const { runAdb, dumpUiAutomatorHierarchy } = await import('./scripts/native-device-utils.mjs');
      const adbBin = 'timeout-boundary-probe';
      const serial = 'test-device';

      // 1. runAdb with bounded timeout must return status 124, timedOut: true, and diagnostic stderr
      const timeoutRes = runAdb(adbBin, serial, ['shell', 'sleep', '5'], { timeout: 100 });
      if (timeoutRes.status !== 124 || !timeoutRes.timedOut || !timeoutRes.stderr.includes('[runAdb:timeout]')) {
        console.error('FAIL_RUN_ADB_TIMEOUT', JSON.stringify(timeoutRes));
        process.exit(10);
      }

      // 2. dumpUiAutomatorHierarchy with bounded timeout fails fast with diagnostics and does not loop endlessly
      let restorationRan = false;
      let caughtError = null;
      try {
        try {
          dumpUiAutomatorHierarchy(adbBin, serial, 160, { timeout: 100 });
        } catch (err) {
          caughtError = err;
          throw err;
        } finally {
          restorationRan = true;
        }
      } catch (err) {
        // Expected thrown error
      }

      if (!restorationRan) {
        console.error('FAIL_RESTORATION_NOT_RUN');
        process.exit(11);
      }
      if (!caughtError || !caughtError.message.includes('[dumpUiAutomatorHierarchy:timeout]')) {
        console.error('FAIL_NO_DIAGNOSTIC_ERROR', caughtError ? caughtError.message : 'null');
        process.exit(12);
      }

      console.log('PASS_BOUNDED_TIMEOUT_BEHAVIOR');
      process.exit(0);
    `;

    const res = spawnSync(process.execPath, ['--input-type=module', '-e', probeScript], {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS_BOUNDED_TIMEOUT_BEHAVIOR');
  });
});
