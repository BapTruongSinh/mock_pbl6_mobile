import { launchScenario } from './scenarios/registry';

export type HarnessDeepLinkParseResult =
  | { allowed: true; caseId: string }
  | {
      allowed: false;
      reason: 'production-mode-blocked' | 'invalid-scheme-or-path' | 'missing-case-id';
    };

export type NativeFoundationFault = 'anchor-offset' | 'overlap' | 'missing-label' | null;
let nativeHarnessHideBars = false;
const barListeners = new Set<(hidden: boolean) => void>();
export function getNativeHarnessHideBars(): boolean {
  return nativeHarnessHideBars;
}
export function subscribeNativeHarnessBars(listener: (hidden: boolean) => void): () => void {
  barListeners.add(listener);
  return () => {
    barListeners.delete(listener);
  };
}
let nativeFoundationFault: NativeFoundationFault = null;
const faultListeners = new Set<(fault: NativeFoundationFault) => void>();
export function getNativeFoundationFault(): NativeFoundationFault {
  return nativeFoundationFault;
}
export function subscribeNativeFoundationFault(
  listener: (fault: NativeFoundationFault) => void,
): () => void {
  faultListeners.add(listener);
  return () => {
    faultListeners.delete(listener);
  };
}

const HARNESS_PREFIX = 'bluemobile://debug/case/';
const CASE_ID_PATTERN = /^[A-Z0-9-]+$/;

export function parseHarnessDeepLink(
  url: string,
  options?: { isProduction?: boolean },
): HarnessDeepLinkParseResult {
  const isProduction = options?.isProduction ?? (typeof __DEV__ !== 'undefined' ? !__DEV__ : false);

  if (isProduction) {
    return {
      allowed: false,
      reason: 'production-mode-blocked',
    };
  }

  if (typeof url !== 'string' || !url.startsWith(HARNESS_PREFIX)) {
    return {
      allowed: false,
      reason: 'invalid-scheme-or-path',
    };
  }

  const rawCaseId = url.slice(HARNESS_PREFIX.length).split('?')[0]?.trim() ?? '';
  if (!rawCaseId || !CASE_ID_PATTERN.test(rawCaseId)) {
    return {
      allowed: false,
      reason: 'missing-case-id',
    };
  }

  return {
    allowed: true,
    caseId: rawCaseId,
  };
}

export async function handleHarnessDeepLink(
  url: string,
  options?: { isProduction?: boolean },
): Promise<HarnessDeepLinkParseResult> {
  const parsed = parseHarnessDeepLink(url, options);
  if (!parsed.allowed) {
    return parsed;
  }
  const hideBars = /[?&]hideBars=([^&]*)/.exec(url)?.[1];
  if (hideBars !== undefined) {
    nativeHarnessHideBars = hideBars === '1';
    barListeners.forEach((listener) => listener(nativeHarnessHideBars));
  }
  const faultValue = /[?&]nativeFault=([^&]*)/.exec(url)?.[1];
  nativeFoundationFault =
    parsed.caseId === 'FOUNDATION-SMOKE' &&
    (faultValue === 'anchor-offset' || faultValue === 'overlap' || faultValue === 'missing-label')
      ? faultValue
      : null;
  faultListeners.forEach((listener) => listener(nativeFoundationFault));
  await launchScenario(parsed.caseId);
  if (parsed.caseId === 'FOUNDATION-SMOKE' && /[?&]storageProbe=failed-save(?:&|$)/.test(url)) {
    const { runNativeFailedSaveProbe } = await import('./nativeStorageProbe');
    await runNativeFailedSaveProbe();
  }
  return parsed;
}
