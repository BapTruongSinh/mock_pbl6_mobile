import { useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';
import { useSession } from '../auth/useSession';
import { parseTicketQr } from '../../shared/native/cameraGateway';
import { canCheckStage, type CheckResult, type CheckOutcome } from './driverManifestRepository';
import type { ManifestController } from './useDriverManifest';
export type ScanView = 'scan' | 'manual' | 'checking' | CheckOutcome;
export const OUTCOME_NODE: Record<CheckOutcome, string> = {
  success: '35:54',
  already: '1138:91',
  unknown: '35:78',
  wrongTrip: '1138:165',
  cancelled: '1138:239',
  refunded: '1138:313',
  used: '1138:387',
  invalid: '1138:461',
  forbidden: '1138:535',
  offline: '1138:608',
  stale: '35:78',
};
export function useDriverCheckIn(
  tripId: string,
  manifest: ManifestController,
  reviewNode?: string,
): {
  view: ScanView;
  node: string;
  code: string;
  setCode: (value: string) => void;
  result: CheckResult | null;
  submit: (input?: string, qr?: boolean) => Promise<void>;
  query: () => Promise<void>;
  reset: () => void;
  manual: () => void;
} {
  const { session } = useSession();
  const first = Object.entries(OUTCOME_NODE).find(([, id]) => id === reviewNode)?.[0] as
    CheckOutcome | undefined;
  const [view, setView] = useState<ScanView>(
    reviewNode === '1138:681'
      ? 'manual'
      : reviewNode === '1138:18'
        ? 'checking'
        : (first ?? 'scan'),
  );
  const [code, setCode] = useState(reviewNode === '1138:681' ? 'TVL-9K2C-7M4Q' : '');
  const [result, setResult] = useState<CheckResult | null>(
    first
      ? {
          outcome: first,
          passenger:
            first === 'success' || first === 'already' ? manifest.data?.passengers[0] : undefined,
        }
      : null,
  );
  const busy = useRef(false);
  const generation = useRef(0);
  const operation = useRef<string | null>(null);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (manifest.state === 'error') {
      generation.current += 1;
      setResult(null);
      setView('offline');
      return;
    }
    if (
      !session ||
      session.role !== 'driver' ||
      manifest.state === 'forbidden' ||
      (manifest.data && !canCheckStage(manifest.data.trip.stage))
    ) {
      generation.current += 1;
      setResult(null);
      setView('forbidden');
    }
  }, [session, manifest.state, manifest.data]);
  const apply = (value: CheckResult): void => {
    setResult(value.outcome === 'forbidden' ? null : value);
    setView(value.outcome);
  };
  const submit = async (input = code, qr = false): Promise<void> => {
    if (busy.current || view === 'checking' || view === 'unknown' || view === 'stale') return;
    let ticket = input.trim();
    if (qr && ticket.startsWith('{')) {
      const parsed = parseTicketQr(ticket);
      if (!parsed.ok) {
        apply({ outcome: 'invalid' });
        return;
      }
      ticket = parsed.value.ticketCode;
    }
    if (ticket.length > 2048) {
      apply({ outcome: 'invalid' });
      return;
    }
    busy.current = true;
    const request = ++generation.current;
    setView('checking');
    setResult(null);
    try {
      if (
        !session ||
        session.role !== 'driver' ||
        !manifest.data ||
        manifest.state !== 'ready' ||
        !canCheckStage(manifest.data.trip.stage)
      ) {
        apply({ outcome: manifest.state === 'stale' ? 'stale' : 'forbidden' });
        return;
      }
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected === false || net.isInternetReachable === false) {
        apply({ outcome: 'offline' });
        return;
      }
      const id = `check-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      operation.current = id;
      const uncertain = __DEV__ && ticket.toUpperCase() === 'TVL-TIME-0001';
      const response = await manifest.repo.check(
        tripId,
        uncertain ? 'TVL-AAAA-3N6H' : ticket,
        manifest.data.version,
        id,
        session,
      );
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (request !== generation.current) return;
      apply(uncertain && response.outcome === 'success' ? { outcome: 'unknown' } : response);
    } catch {
      if (request === generation.current) apply({ outcome: 'unknown' });
    } finally {
      busy.current = false;
    }
  };
  const query = async (): Promise<void> => {
    if (busy.current || !session) return;
    busy.current = true;
    const request = ++generation.current;
    setView('checking');
    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected === false || net.isInternetReachable === false) {
        apply({ outcome: 'offline' });
        return;
      }
      if (!operation.current) {
        apply({ outcome: 'unknown' });
        return;
      }
      const value = await manifest.repo.result(tripId, operation.current, session);
      if (request === generation.current) apply(value);
    } catch {
      if (request === generation.current) apply({ outcome: 'unknown' });
    } finally {
      busy.current = false;
    }
  };
  return {
    view,
    node:
      view === 'scan'
        ? '996:102'
        : view === 'manual'
          ? '1138:681'
          : view === 'checking'
            ? '1138:18'
            : OUTCOME_NODE[view],
    code,
    setCode,
    result,
    submit,
    query,
    reset: () => {
      if (view === 'unknown' || view === 'stale' || (view === 'offline' && operation.current)) {
        void query();
        return;
      }
      operation.current = null;
      setResult(null);
      setCode('');
      setView('scan');
      void manifest.reload();
    },
    manual: () => {
      setResult(null);
      setView('manual');
    },
  };
}
