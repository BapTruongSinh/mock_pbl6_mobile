import { SEARCH_TRIPS, type SearchTrip } from '../search/searchModel';
export type BookingStage = 'seats' | 'login' | 'passengers' | 'qr' | 'processing' | 'ticket';
export interface PassengerDetails {
  fullName: string;
  phone: string;
}
export interface BookingState {
  trip?: SearchTrip;
  refundRequest?: { seats: string[]; stage: 'cancelling' | 'refunding' | 'refunded' };
  cancelledSeats?: string[];
  refundedSeats?: string[];
  stage: BookingStage;
  seats: string[];
  passengers: Record<string, PassengerDetails>;
  expiresAt: number | null;
  pickup: string;
  dropoff: string;
  error: string | null;
}
export const SEATS = ['A', 'B'].flatMap((floor) =>
  Array.from({ length: 17 }, (_, i) => ({
    id: `${floor}${String(i + 1).padStart(2, '0')}`,
    floor,
    status: i === 10 ? 'occupied' : i === 8 ? 'held' : 'available',
  })),
);
export const NK_TRIP = {
  id: 'NK118',
  operator: 'Nguyễn Kim',
  vehicle: 'Limousine giường 34',
  departure: '10:30',
  arrival: '16:45',
  fare: 380000,
  date: '28/08/2026',
};
export const INITIAL_BOOKING: BookingState = {
  stage: 'seats',
  seats: [],
  passengers: {},
  expiresAt: null,
  pickup: 'Bến xe Miền Đông mới · 10:10',
  dropoff: 'Trung tâm Đà Lạt',
  error: null,
};
export type BookingAction =
  | { type: 'toggle'; seatId: string; now: number }
  | { type: 'continue'; authenticated: boolean; now: number }
  | { type: 'passenger'; seatId: string; value: PassengerDetails }
  | { type: 'location'; key: 'pickup' | 'dropoff'; value: string }
  | { type: 'stage'; stage: BookingStage }
  | { type: 'reported-transfer' }
  | { type: 'confirmed'; now: number }
  | { type: 'error'; message: string };
export function validatePassengers(
  seats: readonly string[],
  passengers: Record<string, PassengerDetails>,
): string | null {
  for (const id of seats) {
    const p = passengers[id];
    if (!p || p.fullName.trim().length < 2 || !/^0\d{9}$/.test(p.phone.trim()))
      return `Vui lòng nhập họ tên và số điện thoại hợp lệ cho ghế ${id}.`;
  }
  return seats.length ? null : 'Vui lòng chọn ít nhất một ghế.';
}
export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'toggle': {
      if (
        state.stage !== 'seats' ||
        seatsForTrip(state.trip).find((s) => s.id === action.seatId)?.status !== 'available'
      )
        return state;
      const exists = state.seats.includes(action.seatId);
      if (!exists && state.seats.length >= 6)
        return { ...state, error: 'Chỉ được chọn tối đa 6 ghế.' };
      const seats = exists
        ? state.seats.filter((s) => s !== action.seatId)
        : [...state.seats, action.seatId];
      const passengers = { ...state.passengers };
      if (exists) delete passengers[action.seatId];
      return {
        ...state,
        seats,
        passengers,
        expiresAt: seats.length ? (state.expiresAt ?? action.now + 600000) : null,
        error: null,
      };
    }
    case 'continue':
      if (!state.seats.length) return { ...state, error: 'Vui lòng chọn ghế.' };
      if (!state.expiresAt || action.now >= state.expiresAt)
        return {
          ...state,
          error: 'Thời gian giữ ghế đã hết. Vui lòng chọn lại.',
          seats: [],
          passengers: {},
          expiresAt: null,
          stage: 'seats',
        };
      return { ...state, stage: action.authenticated ? 'passengers' : 'login', error: null };
    case 'passenger':
      return state.seats.includes(action.seatId)
        ? {
            ...state,
            passengers: { ...state.passengers, [action.seatId]: action.value },
            error: null,
          }
        : state;
    case 'location':
      return { ...state, [action.key]: action.value };
    case 'stage':
      return { ...state, stage: action.stage, error: null };
    case 'reported-transfer':
      return state.stage === 'qr' ? { ...state, stage: 'processing' } : state;
    case 'confirmed':
      if (state.stage !== 'qr' && state.stage !== 'processing') return state;
      if (!state.expiresAt || action.now >= state.expiresAt)
        return { ...state, error: 'Phiên thanh toán đã hết hạn. Chưa phát hành vé.' };
      return { ...state, stage: 'ticket', error: null };
    case 'error':
      return { ...state, error: action.message };
  }
}
export function remainingHold(expiresAt: number | null, now: number): string {
  const seconds = Math.max(0, Math.floor(((expiresAt ?? now) - now) / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function bookingTrip(state: BookingState): SearchTrip {
  return (
    state.trip ??
    SEARCH_TRIPS.find((t) => t.id === 'NK118') ?? {
      ...NK_TRIP,
      initials: 'NK',
      color: '#925BE9',
      seats: 6,
      pickup: 'Miền Đông',
      dropoff: 'Trung tâm Đà Lạt',
    }
  );
}
export function seatsForTrip(trip?: SearchTrip): typeof SEATS {
  if (!trip || trip.id === 'NK118') return SEATS;
  const capacity = Number(trip.vehicle.match(/\d+/)?.[0] ?? 34);
  const sleeper = /giường|Giường|Cabin/.test(trip.vehicle);
  const floors = sleeper ? ['A', 'B'] : ['A'];
  return floors.flatMap((floor, index) =>
    Array.from(
      {
        length: sleeper
          ? index === 0
            ? Math.ceil(capacity / 2)
            : Math.floor(capacity / 2)
          : capacity,
      },
      (_, i) => ({
        id: `${floor}${String(i + 1).padStart(2, '0')}`,
        floor,
        status: i === 10 ? 'occupied' : i === 8 ? 'held' : 'available',
      }),
    ),
  );
}

export function tripDuration(departure: string, arrival: string): string {
  const minutes = (s: string): number => {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const duration = (minutes(arrival) - minutes(departure) + 1440) % 1440;
  return `${Math.floor(duration / 60)} giờ ${duration % 60}`;
}
