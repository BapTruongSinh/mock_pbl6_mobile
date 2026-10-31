import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { useSession } from '../auth/useSession';
import { useAppDependencies } from '../../app/providers/AppProviders';
import {
  getDriverTripRepository,
  createDriverTripRepository,
  createMemoryTripStorage,
  type DriverTripRepository,
  type TripStage,
} from './driverTripRepository';
import {
  getManifestRepository,
  createManifestRepository,
  createMemoryManifestStorage,
  type ManifestData,
  type ManifestRepository,
} from './driverManifestRepository';
export type ManifestState = 'ready' | 'loading' | 'empty' | 'error' | 'stale' | 'forbidden';
export interface ManifestReview {
  state?: ManifestState;
  pickup?: boolean;
  pending?: boolean;
  stage?: TripStage;
  scanNode?: string;
}
export interface ManifestController {
  data: ManifestData | null;
  state: ManifestState;
  repo: ManifestRepository;
  trips: DriverTripRepository;
  reload: () => Promise<void>;
  simulateCancel: () => Promise<void>;
}
export function useDriverManifest(
  tripId: string,
  review?: ManifestReview,
  tripService?: DriverTripRepository,
): ManifestController {
  const { repository } = useAppDependencies();
  const { session } = useSession();
  const trips = useMemo(
    () =>
      tripService ??
      (review
        ? createDriverTripRepository(repository, {
            storage: createMemoryTripStorage(),
            initial: {
              ['DRIVER-HOANG-NAM:' + tripId]: { stage: review.stage ?? 'boarding', version: 0 },
            },
          })
        : getDriverTripRepository(repository)),
    [repository, review, tripId, tripService],
  );
  const repo = useMemo(
    () =>
      review
        ? createManifestRepository(trips, createMemoryManifestStorage())
        : getManifestRepository(trips),
    [trips, review],
  );
  const [data, setData] = useState<ManifestData | null>(null);
  const latest = useRef<ManifestData | null>(null);
  const [state, setState] = useState<ManifestState>('loading');
  const generation = useRef(0);
  const first = useRef(true);
  const reload = useCallback(async (): Promise<void> => {
    const request = ++generation.current;
    setState('loading');
    if (!session || session.role !== 'driver') {
      latest.current = null;
      setData(null);
      setState('forbidden');
      return;
    }
    try {
      if (!review) {
        const net = await Network.getNetworkStateAsync();
        if (net.isConnected === false || net.isInternetReachable === false) throw Error('offline');
      }
      const loaded = await repo.load(tripId, session);
      if (request !== generation.current) return;
      if (!loaded.ok) {
        setData(null);
        latest.current = null;
        setState(
          ['unauthorized', 'forbidden', 'notFound'].includes(loaded.code) ? 'forbidden' : 'error',
        );
        return;
      }
      const value = review?.pending
        ? {
            ...loaded.value,
            passengers: loaded.value.passengers.map((row, i) => ({ ...row, checkedIn: i >= 21 })),
          }
        : loaded.value;
      latest.current = value;
      setData(value);
      setState(first.current && review?.state ? review.state : 'ready');
      first.current = false;
    } catch {
      if (request === generation.current) setState('error');
    }
  }, [session, repo, tripId, review]);
  useEffect(() => {
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [reload]);
  useEffect(() => {
    const probe = async (): Promise<void> => {
      if (!session) {
        setData(null);
        latest.current = null;
        setState('forbidden');
        return;
      }
      try {
        const loaded = await repo.load(tripId, session);
        if (!loaded.ok) {
          if (['unauthorized', 'forbidden', 'notFound'].includes(loaded.code)) {
            generation.current += 1;
            setData(null);
            latest.current = null;
            setState('forbidden');
          }
          return;
        }
        if (latest.current && loaded.value.version !== latest.current.version) setState('stale');
        else if (latest.current && loaded.value.trip.stage !== latest.current.trip.stage) {
          latest.current = loaded.value;
          setData(loaded.value);
        }
      } catch {
        /* Foreground reload/retry surfaces storage errors. */
      }
    };
    const timer = setInterval(() => {
      void probe();
    }, 4000);
    const foreground = AppState.addEventListener('change', (s) => {
      if (s === 'active') void reload();
    });
    const net = Network.addNetworkStateListener((n) => {
      if (!review && (n.isConnected === false || n.isInternetReachable === false)) {
        generation.current += 1;
        setState('error');
      }
    });
    return () => {
      clearInterval(timer);
      foreground.remove();
      net.remove();
    };
  }, [session, repo, tripId, review, reload]);
  return {
    data,
    state,
    repo,
    trips,
    reload,
    simulateCancel: async () => {
      if (session) {
        await repo.cancelMock(tripId, session);
        setState('stale');
      }
    },
  };
}
