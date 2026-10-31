import React from 'react';
import { CustomerHomeScreen } from '../../features/home/CustomerHomeScreen';
import { hasScenario, registerScenario, launchScenario } from './registry';
export function ensureHomeScenarioRegistered(): void {
  if (!hasScenario('FIGMA-31-2'))
    registerScenario({
      id: 'FIGMA-31-2',
      route: 'CustomerHome',
      reset: () => undefined,
      expectedTestIds: ['screen.FIGMA-31-2', 'home.swap'],
      render: () =>
        React.createElement(CustomerHomeScreen, {
          onAccount: () => {
            void launchScenario('NEW-CUSTOMER-ACCOUNT');
          },
          onTickets: () => {
            void launchScenario('FIGMA-635-45');
          },
          onSearch: () => {
            void launchScenario('FIGMA-31-44');
          },
        }),
    });
}
