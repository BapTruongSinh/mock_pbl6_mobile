import * as FileSystem from 'expo-file-system/legacy';
import type { Result, Session } from '../../domain/types';
import type { TravelRepository } from '../../repositories/contracts/TravelRepository';
export type TripStage = 'scheduled' | 'boarding' | 'travelling' | 'arrived' | 'completed';
export interface TripProgress {
  stage: TripStage;
  version: number;
  departedAt?: number;
}
export interface DriverTripDetail extends TripProgress {
  id: string;
  departure: string;
  arrival: string;
  origin: string;
  destination: string;
  pickup: string;
  dropoff: string;
  pickupAddress: string;
  dropoffAddress: string;
  plate: string;
  departureAt: number;
  arrivalAt: number;
  boarded: number;
  capacity: number;
}
export const STAGE_LABEL: Record<TripStage, string> = {
  scheduled: 'Đã lên lịch',
  boarding: 'Đang đón khách',
  travelling: 'Đang di chuyển',
  arrived: 'Đã đến nơi',
  completed: 'Đã hoàn thành',
};
export const NEXT_STAGE: Partial<Record<TripStage, TripStage>> = {
  scheduled: 'boarding',
  boarding: 'travelling',
  travelling: 'arrived',
  arrived: 'completed',
};
export type TripSnapshot = Record<string, TripProgress>;
export interface TripStorage {
  load: () => Promise<TripSnapshot>;
  save: (value: TripSnapshot) => Promise<void>;
}
export function createMemoryTripStorage(): TripStorage {
  let snapshot: TripSnapshot = {};
  return {
    load: async () => structuredClone(snapshot),
    save: async (value) => {
      snapshot = structuredClone(value);
    },
  };
}
function nativeTripStorage(): TripStorage {
  const file = `${FileSystem.documentDirectory}driver-trip-progress.v1.json`;
  return {
    async load() {
      const info = await FileSystem.getInfoAsync(file);
      if (!info?.exists) return {};
      const parsed: unknown = JSON.parse(await FileSystem.readAsStringAsync(file));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw Error('Invalid trip data');
      for (const value of Object.values(parsed)) {
        if (
          !value ||
          typeof value !== 'object' ||
          !('stage' in value) ||
          !Object.prototype.hasOwnProperty.call(STAGE_LABEL, String(value.stage)) ||
          !('version' in value) ||
          !Number.isInteger(value.version) ||
          Number(value.version) < 0
        )
          throw Error('Invalid trip progress');
        if (
          'departedAt' in value &&
          (typeof value.departedAt !== 'number' || !Number.isFinite(value.departedAt))
        )
          throw Error('Invalid departure time');
      }
      return parsed as TripSnapshot;
    },
    async save(value) {
      if (!FileSystem.documentDirectory) throw Error('Storage unavailable');
      const temp = file + '.tmp';
      await FileSystem.writeAsStringAsync(temp, JSON.stringify(value));
      await FileSystem.moveAsync({ from: temp, to: file });
    },
  };
}
const CATALOG: Record<string, Omit<DriverTripDetail, keyof TripProgress>> = {
  'TR-204': {
    id: 'TR-204',
    departure: '11:00',
    arrival: '17:00',
    origin: 'TP.HCM',
    destination: 'Lâm Đồng',
    pickup: 'Bến xe Miền Đông mới',
    dropoff: 'Bến xe Lâm Đồng',
    pickupAddress: '501 Hoàng Hữu Nam, TP. Thủ Đức',
    dropoffAddress: '01 Tô Hiến Thành, Lâm Đồng',
    plate: '51B-204.92',
    departureAt: Date.parse('2026-08-28T11:00:00+07:00'),
    arrivalAt: Date.parse('2026-08-28T17:00:00+07:00'),
    boarded: 13,
    capacity: 34,
  },
  'TR-218': {
    id: 'TR-218',
    departure: '18:30',
    arrival: '22:30',
    origin: 'Lâm Đồng',
    destination: 'Nha Trang',
    pickup: 'Bến xe Lâm Đồng',
    dropoff: 'Bến xe phía Nam Nha Trang',
    pickupAddress: '01 Tô Hiến Thành, Lâm Đồng',
    dropoffAddress: 'Điểm trả khách mô phỏng tại Nha Trang',
    plate: '51B-218.36',
    departureAt: Date.parse('2026-08-28T18:30:00+07:00'),
    arrivalAt: Date.parse('2026-08-28T22:30:00+07:00'),
    boarded: 13,
    capacity: 34,
  },
};
export function arrivalUnlockAt(trip: DriverTripDetail): number {
  return Math.max(
    trip.arrivalAt,
    (trip.departedAt ?? trip.departureAt) + (trip.arrivalAt - trip.departureAt),
  );
}
export function canAdvance(trip: DriverTripDetail, now: number): boolean {
  if (trip.stage === 'completed') return false;
  if (trip.stage === 'boarding') return now >= trip.departureAt;
  if (trip.stage === 'travelling') return now >= arrivalUnlockAt(trip);
  return true;
}
export interface DriverTripRepository {
  get: (id: string, session: Session) => Promise<Result<DriverTripDetail>>;
  advance: (
    id: string,
    next: TripStage,
    version: number,
    session: Session,
  ) => Promise<Result<DriverTripDetail>>;
  revoke: (id: string) => void;
  now: () => number;
  setMockTime: (time: number) => void;
}
export function createDriverTripRepository(
  authority: TravelRepository,
  options?: { storage?: TripStorage; now?: () => number; initial?: TripSnapshot },
): DriverTripRepository {
  const storage = options?.storage ?? nativeTripStorage();
  let snapshot: TripSnapshot = {};
  let initialized: Promise<void> | null = null;
  const revoked = new Set<string>();
  let mockTime: number | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const clock = (): number => mockTime ?? (options?.now ?? Date.now)();
  const initialize = (): Promise<void> =>
    initialized ??
    (initialized = storage
      .load()
      .then((value) => {
        snapshot = { ...value, ...options?.initial };
      })
      .catch((error) => {
        initialized = null;
        throw error;
      }));
  const key = (id: string, session: Session): string => `${session.accountId}:${id}`;
  const get = async (id: string, session: Session): Promise<Result<DriverTripDetail>> => {
    const verified = await authority.validateSession(session);
    if (!verified.ok) return verified;
    if (
      verified.value.role !== 'driver' ||
      verified.value.accountId !== 'DRIVER-HOANG-NAM' ||
      revoked.has(id)
    )
      return { ok: false, code: 'forbidden', message: 'Chuyến không còn khả dụng' };
    const trip = CATALOG[id];
    if (!trip) return { ok: false, code: 'notFound', message: 'Chuyến không còn khả dụng' };
    try {
      await initialize();
    } catch {
      return { ok: false, code: 'unknown', message: 'Không tải được chuyến' };
    }
    return {
      ok: true,
      value: { ...trip, ...(snapshot[key(id, session)] ?? { stage: 'scheduled', version: 0 }) },
    };
  };
  return {
    get,
    now: clock,
    setMockTime: (time) => {
      if (__DEV__ && Number.isFinite(time)) mockTime = time;
    },
    revoke: (id) => {
      revoked.add(id);
    },
    advance(id, next, version, session) {
      const operation = queue.then(async (): Promise<Result<DriverTripDetail>> => {
        const current = await get(id, session);
        if (!current.ok) return current;
        const trip = current.value;
        if (trip.version !== version)
          return {
            ok: false,
            code: 'conflict',
            message: 'Thông tin đã thay đổi. Vui lòng tải lại chuyến.',
          };
        if (NEXT_STAGE[trip.stage] !== next)
          return {
            ok: false,
            code: 'validation',
            message: 'Thao tác không phù hợp với trạng thái chuyến',
          };
        if (!canAdvance(trip, clock()))
          return {
            ok: false,
            code: 'validation',
            message:
              trip.stage === 'boarding' ? 'Chưa đến giờ xuất bến' : 'Chưa đủ thời gian đến nơi',
          };
        if (
          next === 'boarding' &&
          Object.entries(snapshot).some(
            ([recordKey, value]) =>
              recordKey.startsWith(session.accountId + ':') &&
              recordKey !== key(id, session) &&
              ['boarding', 'travelling', 'arrived'].includes(value.stage),
          )
        )
          return {
            ok: false,
            code: 'conflict',
            message: 'Hãy hoàn thành chuyến đang chạy trước khi nhận chuyến khác',
          };
        const progress: TripProgress = {
          stage: next,
          version: version + 1,
          ...(trip.departedAt !== undefined ? { departedAt: trip.departedAt } : {}),
          ...(next === 'travelling' ? { departedAt: clock() } : {}),
        };
        const changed = { ...snapshot, [key(id, session)]: progress };
        try {
          await storage.save(changed);
        } catch {
          return {
            ok: false,
            code: 'unknown',
            message: 'Không lưu được trạng thái chuyến. Vui lòng thử lại.',
          };
        }
        snapshot = changed;
        return get(id, session);
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
const repositories = new WeakMap<TravelRepository, DriverTripRepository>();
export function getDriverTripRepository(authority: TravelRepository): DriverTripRepository {
  let repository = repositories.get(authority);
  if (!repository) {
    repository = createDriverTripRepository(authority);
    repositories.set(authority, repository);
  }
  return repository;
}
