import React from 'react';
import { WelcomeScreen } from '../../features/auth/WelcomeScreen';
import { hasScenario, registerScenario, launchScenario } from './registry';
export function ensureWelcomeScenarioRegistered(): void {
  if (!hasScenario('FIGMA-650-4'))
    registerScenario({
      id: 'FIGMA-650-4',
      route: 'Welcome',
      reset: () => undefined,
      expectedTestIds: ['screen.FIGMA-650-4', 'welcome.start'],
      render: () =>
        React.createElement(WelcomeScreen, {
          onStart: () => {
            void launchScenario('FIGMA-64-634');
          },
        }),
    });
}
