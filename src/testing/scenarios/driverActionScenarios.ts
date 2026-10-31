import React from 'react';
import { registerScenario, hasScenario, launchScenario } from './registry';
import { DriverConnectionScreen } from '../../features/driver/DriverConnectionScreen';
import { DriverAccountScreen } from '../../features/driver/DriverAccountScreen';
export function ensureDriverActionScenariosRegistered(): void {
  for (const [id, kind] of [
    ['FIGMA-1146-1196', 'profile'],
    ['DRIVER-SESSION-EXPIRED', 'expired'],
  ] as const)
    if (!hasScenario(id))
      registerScenario({
        id,
        route: 'DriverStatus',
        expectedTestIds: ['driver.connection.' + kind],
        reset: () => undefined,
        render: () =>
          React.createElement(DriverConnectionScreen, {
            kind,
            onRetry: () => void launchScenario('DRIVER-ACCOUNT'),
            onBack: () => void launchScenario('FIGMA-35-2'),
            onNavigate: () => void launchScenario('FIGMA-35-2'),
          }),
      });
  if (!hasScenario('DRIVER-ACCOUNT'))
    registerScenario({
      id: 'DRIVER-ACCOUNT',
      route: 'DriverAccount',
      expectedTestIds: ['screen.account'],
      reset: () => undefined,
      render: () =>
        React.createElement(DriverAccountScreen, {
          onLogout: () => void launchScenario('FIGMA-64-634'),
          onNavigate: () => void launchScenario('FIGMA-35-2'),
        }),
    });
}
