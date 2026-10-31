import type React from 'react';
import type { Scenario } from '../../domain/types';

export interface ExecutableScenario extends Scenario {
  render?: () => React.ReactElement;
}

const scenarioRegistry = new Map<string, ExecutableScenario>();
let activeCaseId: string | null = null;
const launchListeners = new Set<(caseId: string) => void>();

export function registerScenario(scenario: ExecutableScenario): void {
  if (!scenario || typeof scenario.id !== 'string' || scenario.id.trim().length === 0) {
    throw new Error('Scenario registration failed: id must be a non-empty string');
  }
  if (typeof scenario.route !== 'string' || scenario.route.trim().length === 0) {
    throw new Error(`Scenario "${scenario.id}" registration failed: route is required`);
  }
  if (!Array.isArray(scenario.expectedTestIds) || scenario.expectedTestIds.length === 0) {
    throw new Error(
      `Scenario "${scenario.id}" registration failed: expectedTestIds must be a non-empty array`,
    );
  }
  if (scenarioRegistry.has(scenario.id)) {
    throw new Error(`Duplicate scenario ID "${scenario.id}" is already registered`);
  }
  scenarioRegistry.set(scenario.id, scenario);
}

export function hasScenario(caseId: string): boolean {
  return scenarioRegistry.has(caseId);
}

export function getScenario(caseId: string): ExecutableScenario {
  const found = scenarioRegistry.get(caseId);
  if (!found) {
    throw new Error(`Unknown scenario ID "${caseId}"`);
  }
  return found;
}

export async function launchScenario(caseId: string): Promise<void> {
  const scenario = getScenario(caseId);
  scenario.reset();
  activeCaseId = scenario.id;
  for (const listener of launchListeners) {
    listener(scenario.id);
  }
}

export function getActiveScenarioId(): string | null {
  return activeCaseId;
}

export function subscribeScenarioLaunch(listener: (caseId: string) => void): () => void {
  launchListeners.add(listener);
  return () => {
    launchListeners.delete(listener);
  };
}

export function clearScenarioRegistryForTests(): void {
  scenarioRegistry.clear();
  activeCaseId = null;
  launchListeners.clear();
}
