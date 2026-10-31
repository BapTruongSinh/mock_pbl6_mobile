import { getDriverTripRepository, STAGE_LABEL } from './driverTripRepository';
import type { Result, Session } from '../../domain/types';
import type { TravelRepository } from '../../repositories/contracts/TravelRepository';
export type DriverScheduleTab = 'today' | 'upcoming' | 'completed';
export type DriverLoadState = 'ready' | 'loading' | 'empty' | 'error' | 'revoked';
export interface DriverTrip {
  id: string;
  departure: string;
  arrival: string;
  origin: string;
  destination: string;
  pickup: string;
  plate: string;
  status: string;
  boarded?: string;
}
const TODAY: DriverTrip[] = [
  {
    id: 'TR-204',
    departure: '11:00',
    arrival: '17:00',
    origin: 'TP.HCM',
    destination: 'Lâm Đồng',
    pickup: 'Bến xe Miền Đông mới',
    plate: '51B-204.92',
    status: 'Đang đón khách',
  },
  {
    id: 'TR-218',
    departure: '18:30',
    arrival: '22:30',
    origin: 'Lâm Đồng',
    destination: 'Nha Trang',
    pickup: 'Bến xe Lâm Đồng',
    plate: '51B-218.36',
    status: 'Đã lên lịch',
  },
];
export function createDriverScheduleRepository(authority: TravelRepository): {
  load: (session: Session, tab: DriverScheduleTab) => Promise<Result<DriverTrip[]>>;
  revoke: (tripId: string) => void;
} {
  const revoked = new Set<string>();
  const lifecycle = getDriverTripRepository(authority);
  return {
    revoke: (id) => {
      revoked.add(id);
      lifecycle.revoke(id);
    },
    async load(session, tab) {
      const verified = await authority.validateSession(session);
      if (!verified.ok) return verified;
      if (verified.value.role !== 'driver')
        return { ok: false, code: 'forbidden', message: 'Lịch chuyến chỉ dành cho tài xế' };
      if (verified.value.accountId !== 'DRIVER-HOANG-NAM') return { ok: true, value: [] };
      const rows: DriverTrip[] = [];
      for (const trip of TODAY) {
        if (revoked.has(trip.id)) continue;
        const detail = await lifecycle.get(trip.id, session);
        if (!detail.ok) {
          if (detail.code === 'forbidden' || detail.code === 'notFound') continue;
          return detail;
        }
        const completed = detail.value.stage === 'completed';
        if (tab === 'completed' ? !completed : completed) continue;
        if (tab === 'upcoming' && (trip.id !== 'TR-218' || detail.value.stage !== 'scheduled'))
          continue;
        rows.push({
          ...trip,
          status: STAGE_LABEL[detail.value.stage],
          ...(tab === 'upcoming'
            ? { boarded: `${detail.value.boarded} / ${detail.value.capacity} khách` }
            : {}),
        });
      }
      return { ok: true, value: rows };
    },
  };
}
export const REVIEW_TRIPS = TODAY;
