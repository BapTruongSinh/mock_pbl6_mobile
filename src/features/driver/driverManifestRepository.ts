import * as FileSystem from 'expo-file-system/legacy';
import type { Result, Session } from '../../domain/types';
import type { DriverTripRepository, DriverTripDetail, TripStage } from './driverTripRepository';
export type CheckOutcome =
  | 'success'
  | 'already'
  | 'unknown'
  | 'wrongTrip'
  | 'cancelled'
  | 'refunded'
  | 'used'
  | 'invalid'
  | 'forbidden'
  | 'offline'
  | 'stale';
export interface ManifestPassenger {
  id: string;
  code: string;
  name: string;
  seat: string;
  pickupId: string;
  pickupName: string;
  checkedIn: boolean;
  status: 'valid' | 'cancelled' | 'refunded' | 'used';
  checkedAt?: number;
}
export interface ManifestData {
  trip: DriverTripDetail;
  version: number;
  passengers: ManifestPassenger[];
}
export interface CheckResult {
  outcome: CheckOutcome;
  passenger?: ManifestPassenger;
  checkedAt?: number;
}
interface StoredManifest {
  version: number;
  passengers: ManifestPassenger[];
}
interface ManifestSnapshot {
  trips: Record<string, StoredManifest>;
  operations: Record<string, CheckResult>;
}
export interface ManifestStorage {
  load: () => Promise<ManifestSnapshot>;
  save: (snapshot: ManifestSnapshot) => Promise<void>;
}
export function createMemoryManifestStorage(): ManifestStorage {
  let value: ManifestSnapshot = { trips: {}, operations: {} };
  return {
    load: async () => structuredClone(value),
    save: async (next) => {
      value = structuredClone(next);
    },
  };
}
function nativeStorage(): ManifestStorage {
  const file = `${FileSystem.documentDirectory}driver-manifest.v1.json`;
  return {
    async load() {
      const info = await FileSystem.getInfoAsync(file);
      if (!info?.exists) return { trips: {}, operations: {} };
      const raw: unknown = JSON.parse(await FileSystem.readAsStringAsync(file));
      if (
        !raw ||
        typeof raw !== 'object' ||
        !('trips' in raw) ||
        !('operations' in raw) ||
        !raw.trips ||
        typeof raw.trips !== 'object' ||
        !raw.operations ||
        typeof raw.operations !== 'object'
      )
        throw Error('Invalid manifest');
      return raw as ManifestSnapshot;
    },
    async save(value) {
      if (!FileSystem.documentDirectory) throw Error('Storage unavailable');
      await FileSystem.writeAsStringAsync(file + '.tmp', JSON.stringify(value));
      await FileSystem.moveAsync({ from: file + '.tmp', to: file });
    },
  };
}
export const PICKUP_STOPS = [
  { id: 'mien-dong', name: 'Bến xe Miền Đông mới', short: 'Miền Đông mới' },
  { id: 'suoi-tien', name: 'Điểm đón Suối Tiên', short: 'Suối Tiên' },
  { id: 'bien-hoa', name: 'Điểm đón Biên Hòa', short: 'Biên Hòa' },
];
export function canCheckStage(stage: TripStage): boolean {
  return stage === 'boarding' || stage === 'travelling';
}
export function filterManifest(
  rows: ManifestPassenger[],
  pickupIds: string[],
  status: 'all' | 'pending' | 'boarded',
): ManifestPassenger[] {
  return rows.filter(
    (row) =>
      row.status === 'valid' &&
      (!pickupIds.length || pickupIds.includes(row.pickupId)) &&
      (status === 'all' ||
        (status === 'boarded' && row.checkedIn) ||
        (status === 'pending' && !row.checkedIn)),
  );
}
function seed(tripId: string): ManifestPassenger[] {
  return Array.from({ length: 34 }, (_, i) => {
    const stop = PICKUP_STOPS[i < 3 || i > 5 ? 0 : i === 3 ? 1 : 2] ?? PICKUP_STOPS[0];
    return {
      id: `${tripId}-P${i + 1}`,
      code:
        i === 0
          ? 'TVL-AAAA-2K9D'
          : i === 1
            ? 'TVL-9K2C-7M4Q'
            : i === 2
              ? 'TVL-AAAA-3N6H'
              : i === 3
                ? 'TVL-AAAA-8P2K'
                : `TVL-AAAA-${String(i + 1).padStart(4, '0')}`,
      name: ['Nguyễn A.', 'Trần H.', 'Lê K.', 'Phạm M.'][i] ?? `Khách mô phỏng ${i + 1}`,
      seat: `A${String(i + 1).padStart(2, '0')}`,
      pickupId: stop?.id ?? 'mien-dong',
      pickupName: stop?.name ?? 'Bến xe Miền Đông mới',
      checkedIn: i === 0 || i >= 22,
      status: 'valid',
    };
  });
}
export interface ManifestRepository {
  load: (tripId: string, session: Session) => Promise<Result<ManifestData>>;
  check: (
    tripId: string,
    code: string,
    version: number,
    operationId: string,
    session: Session,
  ) => Promise<CheckResult>;
  result: (tripId: string, operationId: string, session: Session) => Promise<CheckResult>;
  cancelMock: (tripId: string, session: Session) => Promise<void>;
}
export function createManifestRepository(
  trips: DriverTripRepository,
  storage: ManifestStorage = nativeStorage(),
): ManifestRepository {
  let snapshot: ManifestSnapshot = { trips: {}, operations: {} };
  let init: Promise<void> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const initialize = (): Promise<void> =>
    init ??
    (init = storage
      .load()
      .then((value) => {
        snapshot = value;
      })
      .catch((error) => {
        init = null;
        throw error;
      }));
  const key = (id: string, s: Session): string => `${s.accountId}:${id}`;
  const load = async (id: string, session: Session): Promise<Result<ManifestData>> => {
    const trip = await trips.get(id, session);
    if (!trip.ok) return trip;
    try {
      await initialize();
    } catch {
      return { ok: false, code: 'unknown', message: 'Chưa tải được danh sách' };
    }
    const stored = snapshot.trips[key(id, session)] ?? { version: 1, passengers: seed(id) };
    const active = stored.passengers.filter((row) => row.status === 'valid');
    return {
      ok: true,
      value: {
        trip: { ...trip.value, boarded: active.filter((row) => row.checkedIn).length },
        version: stored.version,
        passengers: structuredClone(stored.passengers),
      },
    };
  };
  return {
    load,
    async cancelMock(id, session) {
      if (!__DEV__) return;
      const data = await load(id, session);
      if (!data.ok) return;
      const rows = data.value.passengers.map((row, i) =>
        i === 1 ? { ...row, status: 'cancelled' as const } : row,
      );
      const next = {
        ...snapshot,
        trips: {
          ...snapshot.trips,
          [key(id, session)]: { version: data.value.version + 1, passengers: rows },
        },
      };
      await storage.save(next);
      snapshot = next;
    },
    async result(id, op, session) {
      const access = await load(id, session);
      if (!access.ok || !canCheckStage(access.value.trip.stage)) return { outcome: 'forbidden' };
      return structuredClone(
        snapshot.operations[key(id, session) + ':' + op] ?? { outcome: 'unknown' },
      );
    },
    check(id, input, version, op, session) {
      const operation = queue.then(async (): Promise<CheckResult> => {
        const data = await load(id, session);
        if (!data.ok || !canCheckStage(data.value.trip.stage)) return { outcome: 'forbidden' };
        const operationKey = key(id, session) + ':' + op;
        const previous = snapshot.operations[operationKey];
        if (previous) return structuredClone(previous);
        if (data.value.version !== version) return { outcome: 'stale' };
        const code = input.trim().toUpperCase();
        if (!/^TVL-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { outcome: 'invalid' };
        if (code === 'TVL-WRNG-0001') return { outcome: 'wrongTrip' };
        if (code === 'TVL-CNCL-0001') return { outcome: 'cancelled' };
        if (code === 'TVL-RFND-0001') return { outcome: 'refunded' };
        if (code === 'TVL-USED-0001') return { outcome: 'used' };
        const row = data.value.passengers.find((p) => p.code === code);
        if (!row) return { outcome: 'invalid' };
        if (row.status !== 'valid') return { outcome: row.status };
        if (row.checkedIn) return { outcome: 'already', passenger: row, checkedAt: row.checkedAt };
        const recheck = await trips.get(id, session);
        if (!recheck.ok || !canCheckStage(recheck.value.stage)) return { outcome: 'forbidden' };
        const checkedAt = Date.now();
        const passenger = { ...row, checkedIn: true, checkedAt };
        const result: CheckResult = { outcome: 'success', passenger, checkedAt };
        const next = {
          trips: {
            ...snapshot.trips,
            [key(id, session)]: {
              version: version + 1,
              passengers: data.value.passengers.map((p) => (p.id === row.id ? passenger : p)),
            },
          },
          operations: { ...snapshot.operations, [operationKey]: result },
        };
        try {
          await storage.save(next);
        } catch {
          return { outcome: 'unknown' };
        }
        snapshot = next;
        return structuredClone(result);
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
const stores = new WeakMap<DriverTripRepository, ManifestRepository>();
export function getManifestRepository(trips: DriverTripRepository): ManifestRepository {
  let repo = stores.get(trips);
  if (!repo) {
    repo = createManifestRepository(trips);
    stores.set(trips, repo);
  }
  return repo;
}
