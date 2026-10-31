import { bookingTrip, type BookingState } from '../booking/bookingModel';
export type CancellationStage = 'select' | 'preview' | 'cancelling' | 'refunding' | 'refunded';
export interface CancellationState {
  stage: CancellationStage;
  selected: string[];
  cancelled: string[];
}
export const INITIAL_CANCELLATION: CancellationState = {
  stage: 'select',
  selected: [],
  cancelled: [],
};
export type CancellationAction =
  | { type: 'toggle'; seat: string }
  | { type: 'preview' }
  | { type: 'back' }
  | { type: 'request' }
  | { type: 'backend-confirmed' }
  | { type: 'provider-confirmed' };
export function cancellationReducer(
  state: CancellationState,
  action: CancellationAction,
): CancellationState {
  switch (action.type) {
    case 'toggle':
      return state.stage === 'select'
        ? {
            ...state,
            selected: state.selected.includes(action.seat)
              ? state.selected.filter((s) => s !== action.seat)
              : [...state.selected, action.seat],
          }
        : state;
    case 'preview':
      return state.stage === 'select' && state.selected.length
        ? { ...state, stage: 'preview' }
        : state;
    case 'back':
      return state.stage === 'preview' ? { ...state, stage: 'select' } : state;
    case 'request':
      return state.stage === 'preview' && state.selected.length
        ? { ...state, stage: 'cancelling' }
        : state;
    case 'backend-confirmed':
      return state.stage === 'cancelling'
        ? { ...state, stage: 'refunding', cancelled: [...state.selected] }
        : state;
    case 'provider-confirmed':
      return state.stage === 'refunding' ? { ...state, stage: 'refunded' } : state;
  }
}
export function quoteRefund(
  booking: BookingState,
  selected: readonly string[],
): { gross: number; fee: number; refund: number; seats: string[] } {
  const seats = [...new Set(selected)].filter(
    (s) => booking.seats.includes(s) && !booking.cancelledSeats?.includes(s),
  );
  const gross = seats.length * bookingTrip(booking).fare;
  const fee = Math.round(gross * 0.1);
  return { gross, fee, refund: gross - fee, seats };
}
