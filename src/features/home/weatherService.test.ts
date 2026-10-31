import * as Location from 'expo-location';
import { loadLocalWeather, weatherDescription } from './weatherService';
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
afterEach(() => jest.restoreAllMocks());
test('denied permission never requests position or weather', async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: false } as Location.LocationPermissionResponse);
  const fetchMock = jest.spyOn(global, 'fetch');
  expect(await loadLocalWeather(new AbortController().signal)).toBeNull();
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('granted location uses rounded coordinates and returns real current values', async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  jest
    .mocked(Location.getCurrentPositionAsync)
    .mockResolvedValue({
      coords: { latitude: 10.776543, longitude: 106.701234 },
    } as Location.LocationObject);
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temperature_2m: 29.4, weather_code: 95 } }),
    } as Response);
  expect(await loadLocalWeather(new AbortController().signal)).toEqual({
    temperature: 29,
    description: 'Giông',
  });
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain('latitude=10.78&longitude=106.70');
});
test('weather labels distinguish clear rain and thunder', () => {
  expect(weatherDescription(0)).toBe('Trời đẹp');
  expect(weatherDescription(63)).toBe('Có mưa');
  expect(weatherDescription(95)).toBe('Giông');
});
