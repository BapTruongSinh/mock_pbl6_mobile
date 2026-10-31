import React from 'react';
import { DriverScreen } from '../../features/driver/DriverScreen';
import type { DriverReview } from '../../features/driver/useDriverSchedule';
import { hasScenario, registerScenario, launchScenario } from './registry';
const CASES: Record<string, DriverReview> = {
  '35-2': { home: true, state: 'ready' },
  '1160-18': { tab: 'today', state: 'ready' },
  '1136-18': { tab: 'upcoming', state: 'ready' },
  '1136-98': { tab: 'completed', state: 'ready' },
  '1136-178': { state: 'loading' },
  '1136-247': { state: 'empty' },
  '1136-318': { state: 'error' },
  '1136-389': { state: 'revoked' },
};
let generation = 0;
export function ensureDriverScenariosRegistered(): void {
  for (const [node, review] of Object.entries(CASES)) {
    const id = `FIGMA-${node}`;
    if (hasScenario(id)) continue;
    registerScenario({
      id,
      route: 'DriverTrips',
      expectedTestIds: [`screen.driver.${node}`],
      reset: () => {
        generation += 1;
      },
      render: () =>
        React.createElement(DriverScreen, {
          key: generation,
          review,
          onLogout: () => {
            void launchScenario('FIGMA-64-634');
          },
        }),
    });
  }
}
