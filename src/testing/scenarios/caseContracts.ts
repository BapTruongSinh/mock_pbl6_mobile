export type CaseSourceStatus =
  'verified' | 'test-harness-derived' | 'source-derived' | 'quota-blocked' | 'unreviewed';

export interface CaseContract {
  caseId: string;
  route: string;
  sourceStatus: CaseSourceStatus;
  requiredTestIds: string[];
  expectedTextByTestId: Record<string, string>;
  forbiddenTestIds: string[];
}

const caseContracts = new Map<string, CaseContract>();

export function registerCaseContract(contract: CaseContract): void {
  if (!contract.caseId || contract.caseId.trim().length === 0) {
    throw new Error('CaseContract requires a non-empty caseId');
  }
  if (caseContracts.has(contract.caseId)) {
    throw new Error(`Duplicate CaseContract for "${contract.caseId}"`);
  }
  caseContracts.set(contract.caseId, {
    ...contract,
    requiredTestIds: [...contract.requiredTestIds],
    expectedTextByTestId: { ...contract.expectedTextByTestId },
    forbiddenTestIds: [...contract.forbiddenTestIds],
  });
}

export function hasCaseContract(caseId: string): boolean {
  return caseContracts.has(caseId);
}

export function getCaseContract(caseId: string): CaseContract {
  const found = caseContracts.get(caseId);
  if (!found) {
    throw new Error(`Unknown CaseContract for caseId "${caseId}"`);
  }
  return found;
}

export function resetCaseContractsForTests(): void {
  caseContracts.clear();
}
