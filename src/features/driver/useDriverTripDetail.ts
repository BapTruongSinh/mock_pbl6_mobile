import { getManifestRepository } from './driverManifestRepository';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { useAppDependencies } from '../../app/providers/AppProviders';
import { useSession } from '../auth/useSession';
import {
  createDriverTripRepository,
  createMemoryTripStorage,
  getDriverTripRepository,
  canAdvance,
  NEXT_STAGE,
  arrivalUnlockAt,
  type DriverTripDetail,
  type TripStage,
} from './driverTripRepository';
export type TripActionOutcome =
  'success' | 'invalid' | 'conflict' | 'uncertain' | 'expired' | 'offline' | 'forbidden';
export type DetailLoadState = 'ready' | 'loading' | 'error' | 'unavailable';
export interface DetailReview {
  stage?: TripStage;
  state?: DetailLoadState;
  locked?: boolean;
  actionNode?: string;
}
export function useDriverTripDetail(
  tripId: string,
  review?: DetailReview,
): {
  repository: import('./driverTripRepository').DriverTripRepository;
  trip: DriverTripDetail | null;
  state: DetailLoadState;
  busy: boolean;
  now: number;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<void>;
  advance: (expected?: { stage: TripStage; version: number }) => Promise<TripActionOutcome>;
  enabled: boolean;
  simulate: (state: DetailLoadState) => void;
  setClock: (time: number) => void;
  revoke: () => void;
} {
  const { repository } = useAppDependencies();
  const { session } = useSession();
  const service = useMemo(
    () =>
      review
        ? createDriverTripRepository(repository, {
            storage: createMemoryTripStorage(),
            initial: {
              ['DRIVER-HOANG-NAM:' + tripId]: {
                stage: review.stage ?? 'scheduled',
                version: 0,
                ...(['travelling', 'arrived', 'completed'].includes(review.stage ?? '')
                  ? { departedAt: Date.parse('2026-08-28T11:00:00+07:00') }
                  : {}),
              },
            },
            now: () =>
              Date.parse(
                review.locked
                  ? review.stage === 'travelling'
                    ? '2026-08-28T16:59:00+07:00'
                    : '2026-08-28T10:36:00+07:00'
                  : '2026-08-28T17:00:00+07:00',
              ),
          })
        : getDriverTripRepository(repository),
    [repository, tripId, review],
  );
  const [trip, setTrip] = useState<DriverTripDetail | null>(null);
  const [state, setState] = useState<DetailLoadState>('loading');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const initialReviewState = useRef(true);
  const [now, setNow] = useState(service.now);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async (): Promise<void> => {
    const request = ++generation.current;
    setState('loading');
    setTrip(null);
    if (!session || session.role !== 'driver') {
      setState('unavailable');
      return;
    }
    if (review?.state && review.state !== 'ready' && initialReviewState.current) {
      initialReviewState.current = false;
      setState(review.state);
      return;
    }
    try {
      if (!review) {
        const net = await Network.getNetworkStateAsync();
        if (net.isConnected === false || net.isInternetReachable === false) throw Error('offline');
      }
      const result = await service.get(tripId, session);
      if (request !== generation.current) return;
      if (!result.ok) {
        setTrip(null);
        setState(
          ['forbidden', 'unauthorized', 'notFound'].includes(result.code) ? 'unavailable' : 'error',
        );
        return;
      }
      const manifest = review ? null : await getManifestRepository(service).load(tripId, session);
      if (request !== generation.current) return;
      setTrip(
        review?.stage === 'completed'
          ? { ...result.value, boarded: 34 }
          : manifest?.ok
            ? { ...result.value, boarded: manifest.value.trip.boarded }
            : result.value,
      );
      setNow(service.now());
      setState('ready');
    } catch {
      if (request === generation.current) {
        setTrip(null);
        setState('error');
      }
    }
  }, [service, session, tripId, review]);
  useEffect(() => {
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [reload]);
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(service.now());
      if (!session || session.expiresAt <= Date.now()) {
        generation.current += 1;
        setTrip(null);
        setState('unavailable');
      }
    }, 1000);
    const foreground = AppState.addEventListener('change', (value) => {
      if (value === 'active') void reload();
    });
    const network = Network.addNetworkStateListener((value) => {
      if (
        !busyRef.current &&
        !review &&
        (value.isConnected === false || value.isInternetReachable === false)
      ) {
        generation.current += 1;
        setTrip(null);
        setState('error');
      }
    });
    return () => {
      clearInterval(interval);
      foreground.remove();
      network.remove();
    };
  }, [service, session, reload, review]);
  useEffect(() => {
    if (!session || review) return;
    let active = true;
    const timer = setInterval(() => {
      void service
        .get(tripId, session)
        .then((result) => {
          if (
            active &&
            !result.ok &&
            ['forbidden', 'unauthorized', 'notFound'].includes(result.code)
          ) {
            generation.current += 1;
            setTrip(null);
            setState('unavailable');
          }
        })
        .catch(() => undefined);
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [service, session, tripId, review]);
  const advance = async (expected?: {
    stage: TripStage;
    version: number;
  }): Promise<TripActionOutcome> => {
    if (!session || session.expiresAt <= Date.now()) return 'expired';
    if (busyRef.current || !trip) return 'invalid';
    if (expected && (expected.stage !== trip.stage || expected.version !== trip.version))
      return 'conflict';
    const next = NEXT_STAGE[trip.stage];
    if (!next || !canAdvance(trip, service.now())) return 'invalid';
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const request = generation.current;
    try {
      if (!review) {
        const net = await Network.getNetworkStateAsync();
        if (net.isConnected === false || net.isInternetReachable === false) return 'offline';
      }
      const result = await service.advance(tripId, next, trip.version, session);
      if (request !== generation.current) return 'expired';
      if (result.ok) {
        setTrip(result.value);
        setNow(service.now());
        return 'success';
      } else if (['forbidden', 'unauthorized', 'notFound'].includes(result.code)) {
        setTrip(null);
        setState('unavailable');
        return result.code === 'unauthorized' ? 'expired' : 'forbidden';
      } else {
        setError(result.message);
        return result.code === 'conflict'
          ? 'conflict'
          : result.code === 'validation'
            ? 'invalid'
            : 'uncertain';
      }
    } catch {
      if (request === generation.current)
        setError('Không cập nhật được chuyến. Vui lòng kiểm tra kết nối và thử lại.');
      return 'uncertain';
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return {
    repository: service,
    trip,
    state,
    busy,
    now,
    error,
    clearError: () => setError(null),
    reload,
    advance,
    enabled: !!trip && canAdvance(trip, now) && !busy,
    simulate: (next) => {
      generation.current += 1;
      setState(next);
      if (next !== 'ready') setTrip(null);
      else void reload();
    },
    setClock: (time) => {
      service.setMockTime(time);
      setNow(service.now());
    },
    revoke: () => {
      service.revoke(tripId);
      void reload();
    },
  };
}
export { arrivalUnlockAt };
