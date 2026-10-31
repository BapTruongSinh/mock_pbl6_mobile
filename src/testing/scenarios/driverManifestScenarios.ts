import React from 'react';
import { DriverManifestScreen } from '../../features/driver/DriverManifestScreen';
import type { ManifestReview } from '../../features/driver/useDriverManifest';
import { hasScenario, registerScenario, launchScenario } from './registry';
const cases: Record<string, ManifestReview> = {
  '1137-18': {},
  '1137-100': { pickup: true },
  '1137-182': { pending: true },
  '1137-264': { state: 'stale' },
  '1137-345': { state: 'loading' },
  '1137-422': { state: 'empty' },
  '1137-501': { state: 'error' },
  '996-102': { scanNode: '996:102' },
  '1138-681': { scanNode: '1138:681' },
  '1138-18': { scanNode: '1138:18' },
  '35-54': { scanNode: '35:54' },
  '1138-91': { scanNode: '1138:91' },
  '35-78': { scanNode: '35:78' },
  '1138-165': { scanNode: '1138:165' },
  '1138-239': { scanNode: '1138:239' },
  '1138-313': { scanNode: '1138:313' },
  '1138-387': { scanNode: '1138:387' },
  '1138-461': { scanNode: '1138:461' },
  '1138-535': { scanNode: '1138:535' },
  '1138-608': { scanNode: '1138:608' },
  'MANIFEST-READONLY': { stage: 'scheduled' },
  'MANIFEST-ARRIVED': { stage: 'arrived' },
  'MANIFEST-COMPLETED': { stage: 'completed' },
};
let generation = 0;
export function ensureDriverManifestScenariosRegistered(): void {
  for (const [node, review] of Object.entries(cases)) {
    const id = node.startsWith('MANIFEST') ? node : 'FIGMA-' + node;
    if (hasScenario(id)) continue;
    registerScenario({
      id,
      route: 'DriverManifest',
      expectedTestIds: ['driver.detail.title'],
      reset: () => {
        generation += 1;
      },
      render: () =>
        React.createElement(DriverManifestScreen, {
          key: generation,
          tripId: 'TR-204',
          review,
          onBack: () => {
            void launchScenario('FIGMA-1139-18');
          },
          onNavigate: (tab) => {
            void launchScenario(tab === 'home' ? 'FIGMA-35-2' : 'FIGMA-1160-18');
          },
        }),
    });
  }
}
