export interface SearchTrip {
  id: string;
  operator: string;
  initials: string;
  color: string;
  departure: string;
  arrival: string;
  vehicle: string;
  fare: number;
  seats: number;
  pickup: string;
  dropoff: string;
}
export const VEHICLES = [
  'Giường nằm 40 chỗ',
  'Limousine 11 chỗ',
  'Ghế ngồi 29 VIP',
  'Limousine giường 34',
  'Giường nằm 44 chỗ',
  'Limousine 9 chỗ',
  'Limousine 16 chỗ',
  'Ghế ngồi 16 chỗ',
  'Ghế ngồi 29 chỗ',
  'Ghế ngồi 45 chỗ',
  'Cabin 20 phòng',
  'Cabin 22 phòng',
  'Cabin đôi 24 phòng',
  'Giường nằm 36 chỗ',
  'Limousine 24 chỗ',
] as const;
export type SortOrder = 'early' | 'late' | 'price-low' | 'price-high';
export interface SearchFilters {
  sort: SortOrder;
  period: string;
  time: string;
  vehicle: string;
  operator: string;
  pickup: string;
  dropoff: string;
  minFare: string;
  maxFare: string;
}
export const INITIAL_FILTERS: SearchFilters = {
  sort: 'early',
  period: '',
  time: '',
  vehicle: '',
  operator: '',
  pickup: '',
  dropoff: '',
  minFare: '',
  maxFare: '',
};
const firstTrips: SearchTrip[] = [
  {
    id: 'BL201',
    operator: 'BLUE Express',
    initials: '',
    color: '#2E65E4',
    departure: '07:30',
    arrival: '13:45',
    vehicle: VEHICLES[0],
    fare: 320000,
    seats: 18,
    pickup: 'Miền Đông',
    dropoff: 'Bến xe Lâm Đồng',
  },
  {
    id: 'TB105',
    operator: 'Thành Bưởi',
    initials: 'TB',
    color: '#19B388',
    departure: '08:15',
    arrival: '14:30',
    vehicle: VEHICLES[1],
    fare: 350000,
    seats: 9,
    pickup: 'Miền Đông',
    dropoff: 'Bến xe Lâm Đồng',
  },
  {
    id: 'PT212',
    operator: 'Phương Trang',
    initials: 'PT',
    color: '#F07A32',
    departure: '09:00',
    arrival: '15:20',
    vehicle: VEHICLES[2],
    fare: 300000,
    seats: 22,
    pickup: 'Miền Đông',
    dropoff: 'Bến xe Lâm Đồng',
  },
  {
    id: 'NK118',
    operator: 'Nguyễn Kim',
    initials: 'NK',
    color: '#925BE9',
    departure: '10:30',
    arrival: '16:45',
    vehicle: VEHICLES[3],
    fare: 380000,
    seats: 6,
    pickup: 'Miền Đông',
    dropoff: 'Bến xe Lâm Đồng',
  },
];
// All services are local demo fixtures, not live availability or confirmed schedules.
export const SEARCH_TRIPS: SearchTrip[] = [
  ...firstTrips,
  ...Array.from({ length: 8 }, (_, i) => ({
    ...(firstTrips[i % 4] ??
      firstTrips[0] ?? { operator: 'BLUE Express', initials: '', color: '#2E65E4' }),
    id: `MOCK-${i + 1}`,
    departure:
      ['12:00', '13:15', '14:30', '15:45', '18:00', '19:30', '21:00', '22:15'][i] ?? '22:15',
    arrival: ['18:15', '19:30', '20:45', '22:00', '00:15', '01:45', '03:15', '04:30'][i] ?? '04:30',
    vehicle: VEHICLES[i + 4] ?? VEHICLES[0],
    fare: 280000 + i * 15000,
    seats: 5 + i,
    pickup: i % 2 ? 'An Sương' : 'Miền Đông',
    dropoff: i % 2 ? 'Trung tâm Lâm Đồng' : 'Bến xe Lâm Đồng',
  })),
];
export function filterTrips(trips: readonly SearchTrip[], filters: SearchFilters): SearchTrip[] {
  const min = filters.minFare ? Number(filters.minFare) : 0;
  const max = filters.maxFare ? Number(filters.maxFare) : Infinity;
  if (!Number.isFinite(min) || Number.isNaN(max) || min < 0 || max < min) return [];
  if (filters.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(filters.time)) return [];
  const matches = trips.filter((t) => {
    const hour = Number(t.departure.split(':')[0]);
    const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return (
      (!filters.period || period === filters.period) &&
      (!filters.time || t.departure === filters.time) &&
      (!filters.vehicle || t.vehicle === filters.vehicle) &&
      (!filters.operator || t.operator === filters.operator) &&
      (!filters.pickup || t.pickup === filters.pickup) &&
      (!filters.dropoff || t.dropoff === filters.dropoff) &&
      t.fare >= min &&
      t.fare <= max
    );
  });
  return matches.sort((a, b) =>
    filters.sort === 'price-low'
      ? a.fare - b.fare
      : filters.sort === 'price-high'
        ? b.fare - a.fare
        : filters.sort === 'late'
          ? b.departure.localeCompare(a.departure)
          : a.departure.localeCompare(b.departure),
  );
}
export function formatFare(fare: number): string {
  return `${fare.toLocaleString('vi-VN')}đ`;
}
