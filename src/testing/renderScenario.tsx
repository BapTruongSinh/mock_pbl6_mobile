import React from 'react';
import { render, type RenderAPI } from '@testing-library/react-native';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '../app/providers/AppProviders';
import { createTestWorld } from './createTestWorld';
import { getScenario, launchScenario } from './scenarios/registry';

let lastRenderedTree: RenderAPI | null = null;
let lastRenderedCaseId: string | null = null;

export async function renderScenario(caseId: string): Promise<void> {
  const scenario = getScenario(caseId);
  if (lastRenderedTree) {
    lastRenderedTree.unmount();
    lastRenderedTree = null;
  }
  await launchScenario(caseId);
  const world = createTestWorld({ caseId });
  await world.repository.initialize();

  const element = scenario.render ? scenario.render() : <View testID={`screen.${scenario.id}`} />;

  lastRenderedTree = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AppProviders repository={world.repository} now={world.clock.now} initialInitialized={true}>
        {element}
      </AppProviders>
    </SafeAreaProvider>,
  );
  lastRenderedCaseId = caseId;
}

export function getLastRenderedScenario(): { caseId: string; tree: RenderAPI } {
  if (!lastRenderedTree || !lastRenderedCaseId) {
    throw new Error('No scenario has been rendered yet. Call renderScenario(caseId) first.');
  }
  return {
    caseId: lastRenderedCaseId,
    tree: lastRenderedTree,
  };
}
