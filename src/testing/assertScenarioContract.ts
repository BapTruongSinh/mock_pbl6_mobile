import { getCaseContract } from './scenarios/caseContracts';
import { getScenario } from './scenarios/registry';
import { getLastRenderedScenario } from './renderScenario';

export async function assertScenarioContract(caseId: string): Promise<void> {
  const contract = getCaseContract(caseId);
  if (contract.sourceStatus === 'quota-blocked' || contract.sourceStatus === 'unreviewed') {
    throw new Error(
      `Case "${caseId}" cannot pass contract assertion while sourceStatus is "${contract.sourceStatus}"`,
    );
  }

  const scenario = getScenario(caseId);
  const { caseId: renderedCaseId, tree } = getLastRenderedScenario();
  if (renderedCaseId !== caseId) {
    throw new Error(
      `Rendered scenario mismatch: expected "${caseId}", but last rendered was "${renderedCaseId}"`,
    );
  }

  const allRequiredIds = new Set<string>([
    ...scenario.expectedTestIds,
    ...contract.requiredTestIds,
  ]);

  for (const testId of allRequiredIds) {
    const element = tree.queryByTestId(testId);
    if (!element) {
      throw new Error(`Missing required testID "${testId}" in scenario "${caseId}"`);
    }
  }

  for (const [testId, expectedText] of Object.entries(contract.expectedTextByTestId)) {
    const element = tree.queryByTestId(testId);
    if (!element) {
      throw new Error(
        `Missing element with testID "${testId}" for text assertion in scenario "${caseId}"`,
      );
    }
    const matchingTextNodes = tree.queryAllByText(expectedText);
    if (matchingTextNodes.length === 0) {
      throw new Error(
        `Expected text "${expectedText}" for testID "${testId}" was not found in scenario "${caseId}"`,
      );
    }
  }

  for (const forbiddenId of contract.forbiddenTestIds) {
    const forbiddenElement = tree.queryByTestId(forbiddenId);
    if (forbiddenElement) {
      throw new Error(
        `Forbidden contradictory testID "${forbiddenId}" was present in scenario "${caseId}"`,
      );
    }
  }
}
