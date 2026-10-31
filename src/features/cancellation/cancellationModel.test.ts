import { quoteRefund, cancellationReducer, INITIAL_CANCELLATION } from './cancellationModel';
import { INITIAL_BOOKING } from '../booking/bookingModel';
const booking = { ...INITIAL_BOOKING, seats: ['B01', 'B02'] };
test('zero/one/multiple selected, fee and remaining tickets are exact', () => {
  expect(quoteRefund(booking, []).refund).toBe(0);
  expect(quoteRefund(booking, ['B01'])).toMatchObject({
    gross: 380000,
    fee: 38000,
    refund: 342000,
  });
  expect(quoteRefund(booking, ['B01', 'B02']).refund).toBe(684000);
});
test('request does not cancel until backend event; refund waits for separate provider event', () => {
  let s = cancellationReducer(INITIAL_CANCELLATION, { type: 'toggle', seat: 'B01' });
  s = cancellationReducer(s, { type: 'preview' });
  s = cancellationReducer(s, { type: 'request' });
  expect(s.stage).toBe('cancelling');
  expect(s.cancelled).toEqual([]);
  s = cancellationReducer(s, { type: 'backend-confirmed' });
  expect(s.stage).toBe('refunding');
  expect(s.cancelled).toEqual(['B01']);
  s = cancellationReducer(s, { type: 'provider-confirmed' });
  expect(s.stage).toBe('refunded');
  expect(cancellationReducer(s, { type: 'backend-confirmed' })).toBe(s);
});
test('empty selection cannot preview/request and out-of-order confirmation cannot complete', () => {
  expect(cancellationReducer(INITIAL_CANCELLATION, { type: 'preview' })).toBe(INITIAL_CANCELLATION);
  expect(cancellationReducer(INITIAL_CANCELLATION, { type: 'request' })).toBe(INITIAL_CANCELLATION);
  expect(cancellationReducer(INITIAL_CANCELLATION, { type: 'provider-confirmed' })).toBe(
    INITIAL_CANCELLATION,
  );
});
test('already cancelled/foreign seats never add money to refund', () => {
  expect(
    quoteRefund({ ...booking, cancelledSeats: ['B01'] }, ['B01', 'B02', 'UNKNOWN', 'B02']).refund,
  ).toBe(342000);
});
