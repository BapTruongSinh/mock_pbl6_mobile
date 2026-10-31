import { evaluateFoundationToggleInk } from './native-device-utils.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMatrixCases } from './run-case.mjs';
import {
  decodePngRgba,
  detectCanvasPixelContamination,
  detectHierarchyOverlayContamination,
  drawRectOutline,
  encodePngRgba,
  parseUiAutomatorXml,
  readPngHeader,
} from './native-device-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export function evaluateVisualFixture(fixture) {
  const findings = [];

  if (!fixture || typeof fixture !== 'object') {
    return {
      verdict: 'FAIL',
      findings: [
        { severity: 'Critical', code: 'invalid-fixture', message: 'Missing fixture data' },
      ],
    };
  }

  const { reference, geometry, measured } = fixture;
  if (!reference || !geometry || !measured) {
    return {
      verdict: 'FAIL',
      findings: [
        {
          severity: 'Critical',
          code: 'missing-artifacts',
          message: 'reference, geometry, and measured metadata are all required',
        },
      ],
    };
  }

  if (reference.sourceStatus === 'quota-blocked' || reference.sourceStatus === 'unreviewed') {
    findings.push({
      severity: 'Critical',
      code: 'blocked-reference-status',
      message: `Reference sourceStatus is "${reference.sourceStatus}"`,
    });
  }

  if (
    reference.sourceStatus !== 'test-harness-derived' &&
    (!reference.hasFigmaPng || reference.baselineSource === 'implementation')
  ) {
    findings.push({
      severity: 'Critical',
      code: 'invalid-reference-image',
      message: 'Visual comparator requires official Figma reference, never implementation baseline',
    });
  }

  const expectedW = reference.viewport?.width ?? 390;
  const expectedH = reference.viewport?.height ?? 844;
  if (measured.logicalCanvas?.width !== expectedW || measured.logicalCanvas?.height !== expectedH) {
    findings.push({
      severity: 'Critical',
      code: 'canvas-mismatch',
      message: `Measured canvas ${measured.logicalCanvas?.width}x${measured.logicalCanvas?.height} does not match ${expectedW}x${expectedH}`,
    });
  }

  if (
    measured.pngDimensions &&
    (measured.pngDimensions.width !== expectedW || measured.pngDimensions.height !== expectedH)
  ) {
    findings.push({
      severity: 'Critical',
      code: 'png-dimension-mismatch',
      message: `Implementation PNG dimensions ${measured.pngDimensions.width}x${measured.pngDimensions.height} do not match expected ${expectedW}x${expectedH}`,
    });
  }

  if (Number(measured.fontScale) !== 1) {
    findings.push({
      severity: 'Critical',
      code: 'font-scale-mismatch',
      message: `Canonical visual check requires fontScale=1, got ${String(measured.fontScale)}`,
    });
  }

  if (
    Array.isArray(measured.unexpectedOverlayNodes) &&
    measured.unexpectedOverlayNodes.length > 0
  ) {
    findings.push({
      severity: 'Critical',
      code: 'unexpected-overlay-contamination',
      nodes: measured.unexpectedOverlayNodes,
      message: `Detected ${measured.unexpectedOverlayNodes.length} unexpected non-app overlay/system UI node(s) in hierarchy`,
    });
  }

  if (measured.canvasContamination) {
    if (measured.canvasContamination.outsideContaminatedPixels > 0) {
      findings.push({
        severity: 'Critical',
        code: 'canvas-pixel-contamination',
        outsideContaminatedPixels: measured.canvasContamination.outsideContaminatedPixels,
        outsideBounds: measured.canvasContamination.outsideBounds,
        sampleRgb: measured.canvasContamination.outsideSampleRgb,
        message: `Detected ${measured.canvasContamination.outsideContaminatedPixels} non-background pixel(s) outside declared app elements (e.g. floating Tools overlay or system navigation bar)`,
      });
    }
    if (measured.canvasContamination.anchorObstructedPixels > 0) {
      findings.push({
        severity: 'Critical',
        code: 'anchor-obstructed-by-system-ui',
        anchorObstructedPixels: measured.canvasContamination.anchorObstructedPixels,
        sample: measured.canvasContamination.anchorObstructionSample,
        message: `Detected ${measured.canvasContamination.anchorObstructedPixels} obstructed pixel(s) on calibration anchor top strip (status bar / clock collision)`,
      });
    }
  }

  const toleranceDp = geometry.toleranceDp ?? 2;
  const expectedAnchors = Array.isArray(geometry.anchors) ? geometry.anchors : [];
  const measuredAnchors = measured.anchors ?? {};

  for (const anchor of expectedAnchors) {
    const actual = measuredAnchors[anchor.id];
    if (!actual) {
      findings.push({
        severity: 'Critical',
        code: 'missing-anchor',
        id: anchor.id,
        message: `Missing measured bounds for anchor "${anchor.id}"`,
      });
      continue;
    }

    const dx = Math.abs(actual.x - anchor.x);
    const dy = Math.abs(actual.y - anchor.y);
    const dw = Math.abs(actual.width - anchor.width);
    const dh = Math.abs(actual.height - anchor.height);

    if (dx > toleranceDp || dy > toleranceDp || dw > toleranceDp || dh > toleranceDp) {
      findings.push({
        severity: 'Important',
        code: 'anchor-offset-exceeded',
        id: anchor.id,
        expected: { x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height },
        actual: { x: actual.x, y: actual.y, width: actual.width, height: actual.height },
        deltas: { dx, dy, dw, dh },
        toleranceDp,
        message: `Anchor "${anchor.id}" deviates from reference by (dx=${dx}, dy=${dy}, dw=${dw}, dh=${dh}) > ${toleranceDp}dp`,
      });
    }
  }

  return {
    verdict: findings.length === 0 ? 'PASS' : 'FAIL',
    findings,
  };
}

function generateOverlayAndDiffPngs(
  caseDir,
  implBuf,
  geometry,
  measuredAnchors,
  toleranceDp = 2,
  noWrite = false,
) {
  const decoded = decodePngRgba(implBuf);
  const { width, height, rgba } = decoded;
  const overlayRgba = Buffer.from(rgba);
  const diffRgba = Buffer.alloc(width * height * 4);

  // Dim background in diff image so anchor comparison boxes stand out clearly
  for (let i = 0; i < rgba.length; i += 4) {
    diffRgba[i] = Math.round(rgba[i] * 0.25 + 245 * 0.75);
    diffRgba[i + 1] = Math.round(rgba[i + 1] * 0.25 + 247 * 0.75);
    diffRgba[i + 2] = Math.round(rgba[i + 2] * 0.25 + 250 * 0.75);
    diffRgba[i + 3] = 255;
  }

  const expectedAnchors = Array.isArray(geometry.anchors) ? geometry.anchors : [];
  for (const anchor of expectedAnchors) {
    const actual = measuredAnchors[anchor.id];
    const isOk =
      actual &&
      Math.abs(actual.x - anchor.x) <= toleranceDp &&
      Math.abs(actual.y - anchor.y) <= toleranceDp &&
      Math.abs(actual.width - anchor.width) <= toleranceDp &&
      Math.abs(actual.height - anchor.height) <= toleranceDp;

    // Expected box: green if PASS, red if FAIL
    const expectedColor = isOk ? [7, 148, 85, 255] : [217, 45, 32, 255];
    drawRectOutline(overlayRgba, width, height, anchor, expectedColor, 2);
    drawRectOutline(diffRgba, width, height, anchor, expectedColor, 2);

    if (actual) {
      // Measured box: brand blue
      drawRectOutline(overlayRgba, width, height, actual, [44, 107, 237, 255], 1);
      drawRectOutline(diffRgba, width, height, actual, [44, 107, 237, 255], 1);
    }
  }

  if (!noWrite) {
    const overlayPath = path.join(caseDir, 'overlay.png');
    const diffPath = path.join(caseDir, 'diff.png');
    fs.writeFileSync(overlayPath, encodePngRgba(width, height, overlayRgba));
    fs.writeFileSync(diffPath, encodePngRgba(width, height, diffRgba));
  }
  return { overlayPath: 'overlay.png', diffPath: 'diff.png' };
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const fixtureFlagIdx = args.indexOf('--fixture');

  if (fixtureFlagIdx >= 0) {
    const fixturePath = path.resolve(args[fixtureFlagIdx + 1] ?? '');
    if (!fs.existsSync(fixturePath)) {
      console.error(`[check-visual] FAIL: Missing fixture file ${fixturePath}`);
      process.exit(1);
    }
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const report = evaluateVisualFixture(fixture);
    if (report.verdict !== 'PASS') {
      console.error(`[check-visual] FAIL:`, JSON.stringify(report, null, 2));
      process.exit(1);
    }
    console.log(`[check-visual] PASS`);
    process.exit(0);
  }

  const caseId = args[0];
  if (!caseId) {
    console.error('[check-visual] FAIL: Case ID is required');
    process.exit(1);
  }

  const cases = loadMatrixCases(ROOT_DIR);
  if (!cases.has(caseId)) {
    console.error(`[check-visual] FAIL: Unknown case ID "${caseId}"`);
    process.exit(1);
  }

  const caseDir = path.join(ROOT_DIR, 'artifacts', caseId);
  const refPath = path.join(caseDir, 'reference.json');
  const geomPath = path.join(caseDir, 'geometry.json');
  const metaPath = path.join(caseDir, 'meta.json');
  const figmaPngPath = path.join(caseDir, 'figma.png');

  const implFlagIdx = args.indexOf('--impl-png');
  const implPngPath =
    implFlagIdx >= 0
      ? path.resolve(args[implFlagIdx + 1] ?? '')
      : path.join(caseDir, 'implementation.png');

  const xmlFlagIdx = args.indexOf('--xml-dump');
  const xmlDumpPath =
    xmlFlagIdx >= 0
      ? path.resolve(args[xmlFlagIdx + 1] ?? '')
      : path.join(caseDir, 'uiautomator-dump.xml');

  const noWrite = args.includes('--no-write');

  if (
    !fs.existsSync(refPath) ||
    !fs.existsSync(geomPath) ||
    !fs.existsSync(metaPath) ||
    !fs.existsSync(implPngPath)
  ) {
    console.error(
      `[check-visual] FAIL: Missing required reference/geometry/meta/implementation artifacts in ${caseDir}`,
    );
    process.exit(1);
  }

  const reference = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  reference.hasFigmaPng = fs.existsSync(figmaPngPath);
  const geometry = JSON.parse(fs.readFileSync(geomPath, 'utf8'));
  const measured = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const implBuf = fs.readFileSync(implPngPath);
  const pngHeader = readPngHeader(implBuf);
  measured.pngDimensions = { width: pngHeader.width, height: pngHeader.height };

  if (fs.existsSync(xmlDumpPath)) {
    const xmlText = fs.readFileSync(xmlDumpPath, 'utf8');
    const parsedNodes = parseUiAutomatorXml(xmlText, measured.density || 160);
    measured.unexpectedOverlayNodes = detectHierarchyOverlayContamination(parsedNodes, caseId, {
      forbiddenTestIds: reference.forbiddenTestIds ?? [],
    });
  }

  const decoded = decodePngRgba(implBuf);
  const anchorsMap = measured.anchors ?? {};
  let declaredBoxes = [];
  if (caseId === 'FOUNDATION-SMOKE') {
    declaredBoxes = [
      anchorsMap['foundation.anchor'],
      anchorsMap['foundation.logo'],
      anchorsMap['foundation.status'],
      anchorsMap['foundation.toggle'],
    ].filter(Boolean);
  } else {
    const candidateBoxes = [...Object.values(anchorsMap), ...(geometry?.anchors ?? [])];
    declaredBoxes = candidateBoxes
      .filter(
        (b) =>
          b &&
          typeof b.x === 'number' &&
          typeof b.y === 'number' &&
          (b.width < decoded.width || b.height < decoded.height),
      )
      .map((b) => ({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      }));
  }

  if (args.includes('--fault-contaminate-overlay')) {
    measured.unexpectedOverlayNodes = [
      ...(measured.unexpectedOverlayNodes ?? []),
      {
        id: '',
        packageName: 'vn.blue.mobile',
        className: 'androidx.compose.ui.platform.ComposeView',
        text: 'Tools',
        contentDesc: 'Tools',
        bounds: { x: 322, y: 65, width: 52, height: 94 },
      },
    ];
    // Paint a simulated floating grey Tools overlay onto the decoded RGBA buffer
    for (let y = 70; y < 110 && y < decoded.height; y += 1) {
      for (let x = 330; x < 385 && x < decoded.width; x += 1) {
        const idx = (y * decoded.width + x) * 4;
        decoded.rgba[idx] = 160;
        decoded.rgba[idx + 1] = 160;
        decoded.rgba[idx + 2] = 160;
        decoded.rgba[idx + 3] = 255;
      }
    }
  }

  measured.canvasContamination = detectCanvasPixelContamination(
    decoded.rgba,
    decoded.width,
    decoded.height,
    declaredBoxes,
    anchorsMap['foundation.anchor'] ?? null,
    anchorsMap['foundation.logo'] ?? null,
    { caseId },
  );

  const faultOffsetIdx = args.indexOf('--fault-anchor-offset');
  if (faultOffsetIdx >= 0) {
    const offsetDp = Number(args[faultOffsetIdx + 1] ?? 10);
    if (measured.anchors && measured.anchors['foundation.anchor']) {
      measured.anchors['foundation.anchor'] = {
        ...measured.anchors['foundation.anchor'],
        x: measured.anchors['foundation.anchor'].x + offsetDp,
      };
    }
  }

  const generatedImages = generateOverlayAndDiffPngs(
    caseDir,
    implBuf,
    geometry,
    measured.anchors ?? {},
    geometry.toleranceDp ?? 2,
    noWrite,
  );

  const evaluation = evaluateVisualFixture({ reference, geometry, measured });
  if (caseId === 'FOUNDATION-SMOKE' && measured.density === 160 && measured.fontScale === 1) {
    const ink = evaluateFoundationToggleInk(decoded, measured.anchors?.['foundation.toggle']);
    measured.toggleLabelInk = ink;
    if (!ink.valid) {
      evaluation.verdict = 'FAIL';
      evaluation.findings.push({
        severity: 'Important',
        code: 'clipped-native-toggle-label',
        message: 'Canonical CTA glyph ink is incomplete despite accessible XML text',
        ink,
      });
    }
  }

  const report = {
    caseId,
    evaluatedAt: new Date().toISOString(),
    sourceStatus: reference.sourceStatus,
    viewport: reference.viewport,
    measuredLogicalCanvas: measured.logicalCanvas,
    pngDimensions: measured.pngDimensions,
    fontScale: measured.fontScale,
    toleranceDp: geometry.toleranceDp ?? 2,
    overlayPng: generatedImages.overlayPath,
    diffPng: generatedImages.diffPath,
    unexpectedOverlayNodes: measured.unexpectedOverlayNodes ?? [],
    canvasContamination: measured.canvasContamination,
    expectedAnchors: geometry.anchors,
    measuredAnchors: measured.anchors,
    ...evaluation,
  };

  if (!noWrite) {
    fs.writeFileSync(
      path.join(caseDir, 'visual-report.json'),
      JSON.stringify(report, null, 2),
      'utf8',
    );
  }

  if (report.verdict !== 'PASS') {
    console.error(`[check-visual] FAIL for ${caseId}:`, JSON.stringify(report.findings, null, 2));
    process.exit(1);
  }
  console.log(`[check-visual] PASS for ${caseId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
