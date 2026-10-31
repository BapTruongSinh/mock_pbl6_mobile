import { SEARCH_TRIPS } from '../search/searchModel';
import { seatsForTrip, bookingTrip } from './bookingModel';
import { INITIAL_BOOKING, bookingReducer, validatePassengers, SEATS } from './bookingModel';
test('34 distinct seats, blocked seats cannot select, maximum six across floors', () => {
  expect(new Set(SEATS.map((s) => s.id)).size).toBe(34);
  let state = INITIAL_BOOKING;
  state = bookingReducer(state, { type: 'toggle', seatId: 'B11', now: 0 });
  expect(state.seats).toEqual([]);
  for (const id of ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07'])
    state = bookingReducer(state, { type: 'toggle', seatId: id, now: 0 });
  expect(state.seats).toHaveLength(6);
  expect(state.expiresAt).toBe(600000);
});
test('manual transfer never issues tickets, confirmed system event does, duplicates are idempotent', () => {
  let s = { ...INITIAL_BOOKING, seats: ['B01', 'B02'], expiresAt: 600000, stage: 'qr' as const };
  const pending = bookingReducer(s, { type: 'reported-transfer' });
  expect(pending.stage).toBe('processing');
  const paid = bookingReducer(pending, { type: 'confirmed', now: 100 });
  expect(paid.stage).toBe('ticket');
  expect(bookingReducer(paid, { type: 'confirmed', now: 200 })).toBe(paid);
  s = { ...s, expiresAt: 1 };
  expect(bookingReducer(s, { type: 'confirmed', now: 2 }).stage).not.toBe('ticket');
});
test('confirmation can go directly QR -> ticket and mismatched/invalid passenger inputs fail', () => {
  const s = { ...INITIAL_BOOKING, seats: ['B01', 'B02'], expiresAt: 600000, stage: 'qr' as const };
  expect(bookingReducer(s, { type: 'confirmed', now: 1 }).stage).toBe('ticket');
  expect(
    validatePassengers(['B01', 'B02'], { B01: { fullName: 'Minh Anh', phone: '0901234567' } }),
  ).not.toBeNull();
  expect(validatePassengers(['B01'], { B01: { fullName: '', phone: '123' } })).not.toBeNull();
  expect(
    validatePassengers(['B01'], { B01: { fullName: 'Minh Anh', phone: '0901234567' } }),
  ).toBeNull();
});
test('deselecting removes passenger draft; expired hold cannot continue', () => {
  const s = {
    ...INITIAL_BOOKING,
    seats: ['B01'],
    passengers: { B01: { fullName: 'A', phone: '0901234567' } },
    expiresAt: 10,
  };
  expect(
    bookingReducer(s, { type: 'toggle', seatId: 'B01', now: 1 }).passengers.B01,
  ).toBeUndefined();
  expect(bookingReducer(s, { type: 'continue', authenticated: true, now: 11 }).stage).toBe('seats');
});

test('each search fixture preserves trip data and generates its vehicle capacity', () => {
  for (const trip of SEARCH_TRIPS) {
    const seats = seatsForTrip(trip);
    expect(seats).toHaveLength(Number(trip.vehicle.match(/\d+/)?.[0]));
    expect(bookingTrip({ ...INITIAL_BOOKING, trip })).toEqual(trip);
  }
});
