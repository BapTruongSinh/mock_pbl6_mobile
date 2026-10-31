import React from 'react';
import { DriverTripDetailScreen } from '../../features/driver/DriverTripDetailScreen';
import type { DetailReview } from '../../features/driver/useDriverTripDetail';
import { hasScenario, registerScenario, launchScenario } from './registry';
const cases: Record<string, DetailReview> = {
  'FIGMA-1139-18': { stage: 'scheduled' },
  'FIGMA-35-28': { stage: 'boarding' },
  'FIGMA-1139-184': { stage: 'travelling' },
  'FIGMA-1139-267': { stage: 'arrived' },
  'FIGMA-1139-350': { stage: 'completed' },
  'FIGMA-1146-888': { state: 'loading' },
  'FIGMA-1146-964': { state: 'error' },
  'FIGMA-1146-1042': { state: 'unavailable' },
  'FIGMA-1140-18': { stage: 'scheduled', actionNode: '1140:18' },
  'FIGMA-1140-1041': { stage: 'scheduled', actionNode: '1140:1041' },
  'FIGMA-1140-92': { stage: 'boarding', actionNode: '1140:92' },
  'FIGMA-1140-1113': { stage: 'boarding', actionNode: '1140:1113' },
  'FIGMA-1140-240': { stage: 'travelling', actionNode: '1140:240' },
  'FIGMA-1140-1257': { stage: 'travelling', actionNode: '1140:1257' },
  'FIGMA-1140-314': { stage: 'arrived', actionNode: '1140:314' },
  'FIGMA-1140-1401': { stage: 'boarding', actionNode: '1140:1401' },
  'FIGMA-1140-1474': { stage: 'boarding', actionNode: '1140:1474' },
  'FIGMA-1140-1547': { stage: 'boarding', actionNode: '1140:1547' },
  'FIGMA-1135-322': { stage: 'boarding', actionNode: '1135:322' },
  'NEW-DRIVER-COMPLETION-PENDING': { stage: 'arrived', actionNode: '1140:1257' },
  'DRIVER-DEPARTURE-LOCKED': { stage: 'boarding', locked: true },
  'DRIVER-ARRIVAL-LOCKED': { stage: 'travelling', locked: true },
};
let generation = 0;
export function ensureDriverDetailScenariosRegistered(): void {
  for (const [id, review] of Object.entries(cases))
    if (!hasScenario(id))
      registerScenario({
        id,
        route: 'DriverTripDetail',
        expectedTestIds: [
          review.actionNode
            ? 'driver.detail.title'
            : `screen.driverDetail.${id.startsWith('FIGMA-') ? id.replace('FIGMA-', '') : review.stage === 'boarding' ? '35-28' : '1139-184'}`,
        ],
        reset: () => {
          generation += 1;
        },
        render: () =>
          React.createElement(DriverTripDetailScreen, {
            key: generation,
            tripId: 'TR-204',
            review,
            onClose: (completed) => {
              void launchScenario(completed ? 'FIGMA-1136-98' : 'FIGMA-35-2');
            },
            onNavigate: (tab) => {
              void launchScenario(tab === 'home' ? 'FIGMA-35-2' : 'FIGMA-1160-18');
            },
          }),
      });
}
