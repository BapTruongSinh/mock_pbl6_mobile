jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  writeAsStringAsync: jest.fn(async () => undefined),
  moveAsync: jest.fn(async () => undefined),
}));
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDriverSchedule } from './useDriverSchedule';
import { createTestWorld } from '../../testing/createTestWorld';
import type { Session } from '../../domain/types';
let mockSession: Session;
let mockRepository: ReturnType<typeof createTestWorld>['repository'];
const mockNetwork = jest.fn();
jest.mock('../../app/providers/AppProviders', () => ({
  useAppDependencies: () => ({ repository: mockRepository }),
}));
jest.mock('../auth/useSession', () => ({
  useSession: () => ({ session: mockSession, logout: jest.fn() }),
}));
jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => mockNetwork(),
  addNetworkStateListener: () => ({ remove: jest.fn() }),
}));
beforeEach(async () => {
  mockRepository = createTestWorld().repository;
  const login = await mockRepository.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!login.ok) throw Error('missing driver');
  mockSession = login.value;
  mockNetwork.mockResolvedValue({ isConnected: true, isInternetReachable: true });
});
test('offline error can reload; tabs separate schedules', async () => {
  mockNetwork.mockResolvedValueOnce({ isConnected: false });
  const { result } = renderHook(() => useDriverSchedule());
  await waitFor(() => expect(result.current.state).toBe('error'));
  await act(async () => result.current.refresh());
  expect(result.current.trips).toHaveLength(2);
  act(() => result.current.changeTab('upcoming'));
  await waitFor(() => expect(result.current.trips).toHaveLength(1));
  expect(result.current.trips[0]?.id).toBe('TR-218');
});
test('refresh after assignment withdrawn clears selected trip and hides data', async () => {
  const { result } = renderHook(() => useDriverSchedule());
  await waitFor(() => expect(result.current.state).toBe('ready'));
  const trip = result.current.trips[0];
  if (!trip) throw Error('missing trip');
  act(() => result.current.select(trip));
  act(() => result.current.revokeSelected());
  await act(async () => result.current.refresh());
  expect(result.current.state).toBe('revoked');
  expect(result.current.selected).toBeNull();
  expect(result.current.trips).toEqual([]);
});
