import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDriverCheckIn } from './useDriverCheckIn';
import type { ManifestController } from './useDriverManifest';
import type { Session } from '../../domain/types';
let mockSession: Session | null = {
  accountId: 'DRIVER-HOANG-NAM',
  sessionId: 's',
  accessToken: 't',
  role: 'driver',
  expiresAt: Date.now() + 999999,
};
jest.mock('../auth/useSession', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('expo-network', () => ({
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));
function fixture(): ManifestController {
  return {
    state: 'ready',
    data: { version: 1, trip: { id: 'TR-204', stage: 'boarding' }, passengers: [] },
    repo: {
      check: jest.fn(async () => ({
        outcome: 'success',
        passenger: { id: '1', name: 'Khách mock', seat: 'A02' },
      })),
      result: jest.fn(async () => ({ outcome: 'success' })),
    },
    reload: jest.fn(async () => undefined),
  } as unknown as ManifestController;
}
test('duplicate barcode callbacks submit exactly once and unknown query does not write again', async () => {
  const manifest = fixture();
  const { result } = renderHook(() => useDriverCheckIn('TR-204', manifest));
  await act(async () => {
    await Promise.all([
      result.current.submit('TVL-9K2C-7M4Q'),
      result.current.submit('TVL-9K2C-7M4Q'),
    ]);
  });
  expect(manifest.repo.check).toHaveBeenCalledTimes(1);
  expect(result.current.view).toBe('success');
  act(() => result.current.reset());
  await act(async () => result.current.submit('TVL-TIME-0001'));
  expect(result.current.view).toBe('unknown');
  await act(async () => result.current.query());
  expect(manifest.repo.check).toHaveBeenCalledTimes(2);
  expect(manifest.repo.result).toHaveBeenCalledTimes(1);
});
test('logout while awaiting check clears data and cannot be overwritten by late success', async () => {
  mockSession = {
    accountId: 'DRIVER-HOANG-NAM',
    sessionId: 's',
    accessToken: 't',
    role: 'driver',
    expiresAt: Date.now() + 99999,
  };
  const manifest = fixture();
  let resolve: (value: unknown) => void = () => undefined;
  (manifest.repo.check as jest.Mock).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result, rerender } = renderHook(() => useDriverCheckIn('TR-204', manifest));
  let pending: Promise<void>;
  act(() => {
    pending = result.current.submit('TVL-9K2C-7M4Q');
  });
  await waitFor(() => expect(manifest.repo.check).toHaveBeenCalled());
  mockSession = null;
  rerender({});
  await act(async () => {
    resolve({ outcome: 'success', passenger: { name: 'Hidden' } });
    await pending;
  });
  expect(result.current.view).toBe('forbidden');
  expect(result.current.result).toBeNull();
});
