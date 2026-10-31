import React from 'react';
import { FoundationBootstrapView } from '../../app/FoundationBootstrapView';
import { getScenario, hasScenario, registerScenario, type ExecutableScenario } from './registry';
import { hasCaseContract, registerCaseContract } from './caseContracts';

export const FOUNDATION_SMOKE_CASE_ID = 'FOUNDATION-SMOKE';

let resetGeneration = 0;
const resetListeners = new Set<(generation: number) => void>();

export function getFoundationSmokeResetGeneration(): number {
  return resetGeneration;
}

export function subscribeFoundationSmokeReset(listener: (generation: number) => void): () => void {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

export function resetFoundationSmokeState(): void {
  resetGeneration += 1;
  for (const listener of resetListeners) {
    listener(resetGeneration);
  }
}

export function ensureFoundationSmokeScenarioRegistered(): ExecutableScenario {
  if (!hasCaseContract(FOUNDATION_SMOKE_CASE_ID)) {
    registerCaseContract({
      caseId: FOUNDATION_SMOKE_CASE_ID,
      route: 'FoundationSmoke',
      sourceStatus: 'test-harness-derived',
      requiredTestIds: [
        'screen.FOUNDATION-SMOKE',
        'foundation.anchor',
        'foundation.logo',
        'foundation.status',
        'foundation.toggle',
      ],
      expectedTextByTestId: {
        'foundation.status': 'Sẵn sàng',
        'foundation.toggle': 'Kiểm tra',
      },
      forbiddenTestIds: ['app.init.error', 'app.init.loading'],
    });
  }

  if (!hasScenario(FOUNDATION_SMOKE_CASE_ID)) {
    registerScenario({
      id: FOUNDATION_SMOKE_CASE_ID,
      route: 'FoundationSmoke',
      reset: resetFoundationSmokeState,
      expectedTestIds: [
        'screen.FOUNDATION-SMOKE',
        'foundation.anchor',
        'foundation.logo',
        'foundation.status',
        'foundation.toggle',
      ],
      render: () => React.createElement(FoundationBootstrapView, { key: resetGeneration }),
    });
  }

  return getScenario(FOUNDATION_SMOKE_CASE_ID);
}

export const foundationSmokeScenario: ExecutableScenario =
  ensureFoundationSmokeScenarioRegistered();
