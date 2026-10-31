import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

describe('Layout Measurement & Profile Mapping', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  function runLayoutScript(code: string): {
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
        import * as fs from 'node:fs';
        import * as path from 'node:path';
        import { evaluateLayoutFixture } from './scripts/check-layout.mjs';
        import { parseUiAutomatorXml } from './scripts/native-device-utils.mjs';

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

  it('RED/GREEN: extracts non-empty elements from FIGMA-64-634 uiautomator dump', () => {
    const script = `
      const xmlPath = path.join('${rootDir.replace(/\\/g, '/')}', 'artifacts/FIGMA-64-634/uiautomator-dump.xml');
      const geomPath = path.join('${rootDir.replace(/\\/g, '/')}', 'artifacts/FIGMA-64-634/geometry.json');
      const xmlText = fs.readFileSync(xmlPath, 'utf8');
      const geometry = JSON.parse(fs.readFileSync(geomPath, 'utf8'));
      const parsedNodes = parseUiAutomatorXml(xmlText, 160);

      const trackedIds = (geometry.anchors ?? [])
        .map(a => a.id)
        .filter(id => id && !id.startsWith('screen.'));

      if (trackedIds.length < 5) {
        console.error('Tracked IDs too short:', trackedIds.length);
        process.exit(1);
      }

      const containerNode = parsedNodes.find(n => n.id === 'auth.login.form' || n.id === 'foundation.anchor');
      const elements = [];
      for (const id of trackedIds) {
        const node = parsedNodes.find(n => n.id === id);
        if (node) {
          elements.push({
            id: node.id,
            parentId: containerNode && node.id !== containerNode.id ? containerNode.id : undefined,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
          });
        }
      }

      if (elements.length < 5) {
        console.error('Extracted elements too short:', elements.length);
        process.exit(2);
      }

      const fixture = {
        caseId: 'FIGMA-64-634',
        profiles: [
          {
            name: 'w390-f1.0',
            viewportWidth: 390,
            viewportHeight: 844,
            density: 160,
            fontScale: 1,
            systemBarsVisible: false,
            scrollable: true,
            elements,
            unexpectedOverlayNodes: [],
          },
        ],
      };

      const result = evaluateLayoutFixture(fixture);
      const emptyFindings = result.findings.filter(f => f.code === 'empty-profile-elements');
      if (emptyFindings.length > 0) {
        console.error('Empty profile elements found');
        process.exit(3);
      }

      const overlapFindings = result.findings.filter(f => f.code === 'sibling-overlap');
      if (overlapFindings.length > 0) {
        console.error('Sibling overlap found:', JSON.stringify(overlapFindings));
        process.exit(4);
      }

      console.log('SUCCESS: elements extracted cleanly without empty-profile or sibling-overlap');
    `;
    const res = runLayoutScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: elements extracted cleanly');
  });

  it('rejects profile with empty elements as Critical empty-profile-elements', () => {
    const script = `
      const emptyFixture = {
        caseId: 'FIGMA-64-634',
        profiles: [
          {
            name: 'empty-test',
            viewportWidth: 390,
            viewportHeight: 844,
            density: 160,
            fontScale: 1,
            systemBarsVisible: false,
            scrollable: false,
            elements: [],
            unexpectedOverlayNodes: [],
          },
        ],
      };
      const result = evaluateLayoutFixture(emptyFixture);
      if (result.verdict !== 'FAIL') process.exit(1);
      if (!result.findings.some(f => f.code === 'empty-profile-elements')) process.exit(2);
      console.log('SUCCESS: empty profile rejected');
    `;
    const res = runLayoutScript(script);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SUCCESS: empty profile rejected');
  });
});
