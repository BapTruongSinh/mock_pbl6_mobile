import { filterTrips, INITIAL_FILTERS, SEARCH_TRIPS } from './searchModel';
test('defaults contain twelve real mock trips and fifteen vehicle options are independent', () => {
  expect(filterTrips(SEARCH_TRIPS, INITIAL_FILTERS)).toHaveLength(12);
});
test('combines operator, vehicle, time, stops and inclusive fare boundaries', () => {
  const result = filterTrips(SEARCH_TRIPS, {
    ...INITIAL_FILTERS,
    operator: 'BLUE Express',
    vehicle: 'Giường nằm 40 chỗ',
    period: 'morning',
    time: '07:30',
    pickup: 'Miền Đông',
    dropoff: 'Bến xe Đà Lạt',
    minFare: '320000',
    maxFare: '320000',
  });
  expect(result.map((t) => t.id)).toEqual(['BL201']);
});
test('price sort works without mutating fixtures and impossible combinations return empty', () => {
  const sorted = filterTrips(SEARCH_TRIPS, { ...INITIAL_FILTERS, sort: 'price-low' });
  expect(sorted[0]?.fare).toBe(Math.min(...SEARCH_TRIPS.map((t) => t.fare)));
  expect(SEARCH_TRIPS[0]?.id).toBe('BL201');
  expect(
    filterTrips(SEARCH_TRIPS, { ...INITIAL_FILTERS, operator: 'BLUE Express', maxFare: '1' }),
  ).toEqual([]);
});
test('evening includes 18:00 and malformed times or inverted prices never match', () => {
  expect(
    filterTrips(SEARCH_TRIPS, { ...INITIAL_FILTERS, period: 'evening' }).every(
      (t) => Number(t.departure.split(':')[0]) >= 18,
    ),
  ).toBe(true);
  expect(filterTrips(SEARCH_TRIPS, { ...INITIAL_FILTERS, time: '99:90' })).toEqual([]);
  expect(
    filterTrips(SEARCH_TRIPS, { ...INITIAL_FILTERS, minFare: '400000', maxFare: '300000' }),
  ).toEqual([]);
});
