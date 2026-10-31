import React from 'react';
import { RegisterScreen } from '../../features/auth/RegisterScreen';
import {
  getScenario,
  hasScenario,
  registerScenario,
  launchScenario,
  type ExecutableScenario,
} from './registry';
let generation = 0;
export function ensureRegisterScenarioRegistered(): ExecutableScenario {
  if (!hasScenario('FIGMA-64-638'))
    registerScenario({
      id: 'FIGMA-64-638',
      route: 'Register',
      reset: () => {
        generation += 1;
      },
      expectedTestIds: ['screen.FIGMA-64-638', 'auth.register.form', 'auth.register.submit'],
      render: () =>
        React.createElement(RegisterScreen, {
          key: generation,
          onNavigateToLogin: () => {
            void launchScenario('FIGMA-64-634');
          },
        }),
    });
  return getScenario('FIGMA-64-638');
}
