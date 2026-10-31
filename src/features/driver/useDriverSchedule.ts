import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Network from 'expo-network';
import { useAppDependencies } from '../../app/providers/AppProviders';
import { useSession } from '../auth/useSession';
import {
  createDriverScheduleRepository,
  REVIEW_TRIPS,
  type DriverTrip,
  type DriverLoadState,
  type DriverScheduleTab,
} from './driverScheduleRepository';
export interface DriverReview {
  tab?: DriverScheduleTab;
  state?: DriverLoadState;
  home?: boolean;
}
export function useDriverSchedule(review?: DriverReview): {
  session: ReturnType<typeof useSession>['session'];
  logout: () => Promise<void>;
  tab: DriverScheduleTab;
  state: DriverLoadState;
  trips: DriverTrip[];
  selected: DriverTrip | null;
  select: (trip: DriverTrip) => void;
  clearSelection: () => void;
  changeTab: (tab: DriverScheduleTab) => void;
  refresh: () => Promise<void>;
  simulate: (state: DriverLoadState) => void;
  revokeSelected: () => void;
} {
  const { repository } = useAppDependencies();
  const { session, logout } = useSession();
  const schedule = useMemo(() => createDriverScheduleRepository(repository), [repository]);
  const [tab, setTab] = useState<DriverScheduleTab>(review?.tab ?? 'today');
  const [state, setState] = useState<DriverLoadState>(review?.state ?? 'loading');
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [selected, setSelected] = useState<DriverTrip | null>(null);
  const generation = useRef(0);
  const selectedRef = useRef<DriverTrip | null>(null);
  const forced = useRef<DriverLoadState | null>(null);
  const revokedIds = useRef(new Set<string>());
  const refresh = useCallback(async (): Promise<void> => {
    const request = ++generation.current;
    setState('loading');
    try {
      if (review) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (request !== generation.current) return;
        const source =
          tab === 'completed'
            ? REVIEW_TRIPS.slice(0, 1).map((t) => ({ ...t, status: 'Đã hoàn thành' }))
            : tab === 'upcoming'
              ? REVIEW_TRIPS.slice(1).map((t) => ({ ...t, boarded: '13 / 34 khách' }))
              : REVIEW_TRIPS;
        const assigned = source.filter((trip) => !revokedIds.current.has(trip.id));
        if (selectedRef.current && !assigned.some((trip) => trip.id === selectedRef.current?.id)) {
          selectedRef.current = null;
          setSelected(null);
          setTrips([]);
          setState('revoked');
          return;
        }
        setTrips(structuredClone(assigned));
        setState(forced.current ?? review.state ?? 'ready');
        return;
      }
      if (!session || session.role !== 'driver') {
        setTrips([]);
        setSelected(null);
        selectedRef.current = null;
        setState('revoked');
        return;
      }
      const network = await Network.getNetworkStateAsync();
      if (network.isConnected === false || network.isInternetReachable === false)
        throw new Error('offline');
      const result = await schedule.load(session, tab);
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (request !== generation.current) return;
      if (!result.ok) {
        setTrips([]);
        setSelected(null);
        selectedRef.current = null;
        setState(
          result.code === 'forbidden' || result.code === 'unauthorized' ? 'revoked' : 'error',
        );
        return;
      }
      if (selectedRef.current && !result.value.some((t) => t.id === selectedRef.current?.id)) {
        setTrips([]);
        setSelected(null);
        selectedRef.current = null;
        setState('revoked');
        return;
      }
      setTrips(result.value);
      setState(forced.current ?? (result.value.length ? 'ready' : 'empty'));
    } catch {
      if (request === generation.current) {
        setTrips([]);
        setState('error');
      }
    }
  }, [review, session, tab, schedule]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
    if (review) return;
    const subscription = Network.addNetworkStateListener((network) => {
      if (network.isConnected === false || network.isInternetReachable === false) {
        generation.current += 1;
        setTrips([]);
        setState('error');
      }
    });
    return () => subscription.remove();
  }, [review]);
  return {
    session,
    logout,
    tab,
    state,
    trips,
    selected,
    select: (trip) => {
      selectedRef.current = trip;
      setSelected(trip);
    },
    clearSelection: () => {
      selectedRef.current = null;
      setSelected(null);
    },
    changeTab: (next) => {
      forced.current = null;
      selectedRef.current = null;
      setSelected(null);
      setTab(next);
    },
    refresh,
    simulate: (next) => {
      forced.current = next;
      if (next !== 'ready') {
        generation.current += 1;
        setTrips([]);
      }
      setState(next);
    },
    revokeSelected: () => {
      if (selectedRef.current) {
        revokedIds.current.add(selectedRef.current.id);
        schedule.revoke(selectedRef.current.id);
      }
    },
  };
}
