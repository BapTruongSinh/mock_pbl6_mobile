import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

describe('Visual Detector — Case-Aware Overlay & Pixel Contamination', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  function runDetectorScript(code: string): {
    status: number | null;
    stdout: string;
    stderr: string;
  } {
    const res = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
        import {
          detectHierarchyOverlayContamination,
          detectCanvasPixelContamination,
        } from './scripts/native-device-utils.mjs';

        ${code}
        `,
      ],
      {
        cwd: rootDir,
        encoding: 'utf8',
      },
    );
    return {
      status: res.status,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
    };
  }

  it('RED/GREEN: does not label own vn.blue.mobile app nodes as unexpected-overlay in FIGMA-64-634', () => {
    const script = `
      const sampleAppNodes = [
        {
          id: 'auth.login.form',
          packageName: 'vn.blue.mobile',
          className: 'android.view.ViewGroup',
          text: '',
          contentDesc: '',
          x: 16,
          y: 20,
          width: 358,
          height: 804,
        },
        {
          id: 'auth.login.brandLogo',
          packageName: 'vn.blue.mobile',
          className: 'android.widget.ImageView',
          text: '',
          contentDesc: 'Logo chính thức BLUE',
          x: 153,
          y: 48,
          width: 84,
          height: 26,
        },
        {
          id: 'auth.login.title',
          packageName: 'vn.blue.mobile',
          className: 'android.widget.TextView',
          text: 'Hành trình đang chờ bạn',
          contentDesc: '',
          x: 40,
          y: 121,
          width: 310,
          height: 38,
        },
        {
          id: 'auth.login.termsFooter',
          packageName: 'vn.blue.mobile',
          className: 'android.widget.TextView',
          text: 'Điều khoản dịch vụ  ·  Chính sách bảo mật',
          contentDesc: '',
          x: 40,
          y: 768,
          width: 310,
          height: 32,
        },
      ];
      const unexpected = detectHierarchyOverlayContamination(sampleAppNodes, 'FIGMA-64-634');
      if (unexpected.length !== 0) {
        console.error('False positive unexpected nodes:', unexpected.length);
        process.exit(1);
      }
      console.log('SUCCESS: 0 false positives');
    `;
    const res = runDetectorScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: 0 false positives');
  });

  it('detects external system package overlay (e.g. SystemUI) as unexpected in FIGMA-64-634', () => {
    const script = `
      const nodes = [
        {
          id: 'auth.login.form',
          packageName: 'vn.blue.mobile',
          className: 'android.view.ViewGroup',
          text: '',
          contentDesc: '',
          x: 16, y: 20, width: 358, height: 804,
        },
        {
          id: 'statusBarBackground',
          packageName: 'com.android.systemui',
          className: 'android.view.View',
          text: '',
          contentDesc: '',
          x: 0, y: 0, width: 390, height: 24,
        },
      ];
      const unexpected = detectHierarchyOverlayContamination(nodes, 'FIGMA-64-634');
      const hasSystemUi = unexpected.some(n => n.packageName === 'com.android.systemui');
      if (!hasSystemUi) {
        console.error('Failed to detect SystemUI overlay');
        process.exit(1);
      }
      console.log('SUCCESS: detected SystemUI');
    `;
    const res = runDetectorScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: detected SystemUI');
  });

  it('detects ComposeView / Tools developer menu as unexpected overlay in FIGMA-64-634', () => {
    const script = `
      const nodes = [
        {
          id: 'auth.login.form',
          packageName: 'vn.blue.mobile',
          className: 'android.view.ViewGroup',
          text: '',
          contentDesc: '',
          x: 16, y: 20, width: 358, height: 804,
        },
        {
          id: '',
          packageName: 'vn.blue.mobile',
          className: 'androidx.compose.ui.platform.ComposeView',
          text: 'Tools',
          contentDesc: 'Tools',
          x: 322, y: 65, width: 52, height: 94,
        },
      ];
      const unexpected = detectHierarchyOverlayContamination(nodes, 'FIGMA-64-634');
      const hasTools = unexpected.some(n => n.text === 'Tools' || n.className.includes('ComposeView'));
      if (!hasTools) {
        console.error('Failed to detect ComposeView Tools overlay');
        process.exit(1);
      }
      console.log('SUCCESS: detected Tools overlay');
    `;
    const res = runDetectorScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: detected Tools overlay');
  });

  it('preserves strict allowed list behavior for FOUNDATION-SMOKE', () => {
    const script = `
      const validFoundation = [
        {
          id: 'foundation.anchor',
          packageName: 'vn.blue.mobile',
          className: 'android.view.ViewGroup',
          text: '',
          contentDesc: 'Khung chuẩn hiệu chỉnh 100 nhân 50',
          x: 40, y: 50, width: 100, height: 50,
        },
      ];
      const unexpClean = detectHierarchyOverlayContamination(validFoundation, 'FOUNDATION-SMOKE');
      if (unexpClean.length !== 0) process.exit(1);

      const invalidFoundation = [
        ...validFoundation,
        {
          id: 'auth.login.title',
          packageName: 'vn.blue.mobile',
          className: 'android.widget.TextView',
          text: 'Hành trình đang chờ bạn',
          contentDesc: '',
          x: 40, y: 121, width: 310, height: 38,
        },
      ];
      const unexpContam = detectHierarchyOverlayContamination(invalidFoundation, 'FOUNDATION-SMOKE');
      if (unexpContam.length === 0) process.exit(2);
      console.log('SUCCESS: foundation smoke strictness preserved');
    `;
    const res = runDetectorScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: foundation smoke strictness preserved');
  });

  it('detects canvas pixel contamination outside declared boxes', () => {
    const script = `
      const width = 100;
      const height = 100;
      const rgba = Buffer.alloc(width * height * 4, 255);
      const declaredBoxes = [{ x: 10, y: 10, width: 80, height: 80 }];

      const clean = detectCanvasPixelContamination(rgba, width, height, declaredBoxes, null, null, {
        bgR: 255, bgG: 255, bgB: 255,
      });
      if (clean.outsideContaminatedPixels !== 0) process.exit(1);

      const idx = (5 * width + 5) * 4;
      rgba[idx] = 100;
      rgba[idx + 1] = 100;
      rgba[idx + 2] = 100;

      const contaminated = detectCanvasPixelContamination(rgba, width, height, declaredBoxes, null, null, {
        bgR: 255, bgG: 255, bgB: 255,
      });
      if (contaminated.outsideContaminatedPixels !== 1) process.exit(2);
      console.log('SUCCESS: canvas contamination verified');
    `;
    const res = runDetectorScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: canvas contamination verified');
  });
});
