import React from 'react';
import { ensureHomeScenarioRegistered } from './FIGMA-31-2';
import { ensureGuestScenariosRegistered } from './guestScenarios';
import {
  getScenario,
  hasScenario,
  registerScenario,
  launchScenario,
  type ExecutableScenario,
} from './registry';
import { hasCaseContract, registerCaseContract } from './caseContracts';
import { LoginScreen } from '../../features/auth/LoginScreen';

export const FIGMA_64_634_CASE_ID = 'FIGMA-64-634';

let resetGeneration = 0;
const resetListeners = new Set<(generation: number) => void>();

export function getLoginResetGeneration(): number {
  return resetGeneration;
}

export function subscribeLoginReset(listener: (generation: number) => void): () => void {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

export function resetLoginScenarioState(): void {
  resetGeneration += 1;
  for (const listener of resetListeners) {
    listener(resetGeneration);
  }
}

let loginScreenRenderer: (() => React.ReactElement) | null = null;

export function setLoginScreenRenderer(renderer: () => React.ReactElement): void {
  loginScreenRenderer = renderer;
}

export function ensureLoginScenarioRegistered(): ExecutableScenario {
  ensureGuestScenariosRegistered();
  ensureHomeScenarioRegistered();
  if (!hasCaseContract(FIGMA_64_634_CASE_ID)) {
    registerCaseContract({
      caseId: FIGMA_64_634_CASE_ID,
      route: 'Login',
      sourceStatus: 'verified',
      requiredTestIds: [
        'screen.FIGMA-64-634',
        'auth.login.form',
        'auth.login.submit',
        'auth.login.identifierInput',
        'auth.login.passwordInput',
        'auth.login.guestButton',
      ],
      expectedTextByTestId: {
        'auth.login.submit': 'Đăng nhập',
        'auth.login.guestButton': 'Tiếp tục với tư cách khách',
      },
      forbiddenTestIds: ['app.init.error', 'screen.FIGMA-64-638'],
    });
  }

  if (!hasScenario(FIGMA_64_634_CASE_ID)) {
    registerScenario({
      id: FIGMA_64_634_CASE_ID,
      route: 'Login',
      reset: resetLoginScenarioState,
      expectedTestIds: [
        'screen.FIGMA-64-634',
        'auth.login.form',
        'auth.login.submit',
        'auth.login.identifierInput',
        'auth.login.passwordInput',
        'auth.login.guestButton',
      ],
      render: () => {
        if (loginScreenRenderer) {
          return loginScreenRenderer();
        }
        return React.createElement(LoginScreen, {
          key: resetGeneration,
          onLoginSuccess: (role) => {
            if (role === 'customer') void launchScenario('FIGMA-31-2');
            else void launchScenario('FIGMA-35-2');
          },
          onNavigateToGuest: () => {
            void launchScenario('NEW-GUEST-MENU');
          },
          onNavigateToRegister: () => {
            void launchScenario('FIGMA-64-638');
          },
        });
      },
    });
  }

  return getScenario(FIGMA_64_634_CASE_ID);
}

export const figma64_634Scenario: ExecutableScenario = ensureLoginScenarioRegistered();
