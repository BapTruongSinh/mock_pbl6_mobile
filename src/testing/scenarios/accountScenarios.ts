import React from 'react';
import { AccountScreen } from '../../features/account/AccountScreen';
import { hasScenario, registerScenario, launchScenario } from './registry';
export function ensureAccountScenarioRegistered(): void {
  if (hasScenario('NEW-CUSTOMER-ACCOUNT')) return;
  registerScenario({
    id: 'NEW-CUSTOMER-ACCOUNT',
    route: 'CustomerAccount',
    expectedTestIds: ['screen.account'],
    reset: () => undefined,
    render: () =>
      React.createElement(AccountScreen, {
        onLogin: () => {
          void launchScenario('FIGMA-64-634');
        },
        onLogout: () => {
          void launchScenario('FIGMA-64-634');
        },
        onNavigate: (tab) => {
          if (tab === 'tickets') void launchScenario('FIGMA-635-45');
          else if (tab === 'home') void launchScenario('FIGMA-31-2');
          else if (tab === 'search') void launchScenario('FIGMA-31-44');
        },
      }),
  });
}
