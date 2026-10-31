import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAccount } from './useAccount';
const mockSession = { accountId: 'profile-test' };
const mockRepository = {
  getAccountProfile: jest.fn(),
  updateAccountAvatar: jest.fn(),
  changePassword: jest.fn(),
};
const mockPick = jest.fn();
const mockCopy = jest.fn();
jest.mock('../../app/providers/AppProviders', () => ({
  useAppDependencies: () => ({ repository: mockRepository }),
}));
jest.mock('../auth/useSession', () => ({
  useSession: () => ({ session: mockSession, logout: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockPick(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: (...args: unknown[]) => mockCopy(...args),
  deleteAsync: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockRepository.getAccountProfile.mockResolvedValue({
    ok: true,
    value: { accountId: 'profile-test', fullName: 'Khách thử' },
  });
});
test('password mismatch never calls repository; success clears all fields', async () => {
  const { result } = renderHook(useAccount);
  await waitFor(() => expect(result.current.profile?.fullName).toBe('Khách thử'));
  act(() => {
    result.current.setCurrentPassword('current123');
    result.current.setNewPassword('new12345');
    result.current.setConfirmPassword('different');
  });
  await act(async () => result.current.changePassword());
  expect(mockRepository.changePassword).not.toHaveBeenCalled();
  expect(result.current.notice?.variant).toBe('error');
  act(() => result.current.setConfirmPassword('new12345'));
  mockRepository.changePassword.mockResolvedValue({ ok: true });
  await act(async () => result.current.changePassword());
  expect(mockRepository.changePassword).toHaveBeenCalledWith(mockSession, 'current123', 'new12345');
  expect(
    result.current.currentPassword + result.current.newPassword + result.current.confirmPassword,
  ).toBe('');
});
test('picker cancellation preserves avatar; chosen photo copied before save', async () => {
  const { result } = renderHook(useAccount);
  await waitFor(() => expect(result.current.profile).not.toBeNull());
  mockPick.mockResolvedValueOnce({ canceled: true });
  await act(async () => result.current.changeAvatar());
  expect(mockCopy).not.toHaveBeenCalled();
  expect(mockRepository.updateAccountAvatar).not.toHaveBeenCalled();
  mockPick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: 'file:///picker/photo.png' }],
  });
  mockRepository.updateAccountAvatar.mockResolvedValue({
    ok: true,
    value: {
      accountId: 'profile-test',
      fullName: 'Khách thử',
      avatarUri: 'file:///saved/avatar.jpg',
    },
  });
  await act(async () => result.current.changeAvatar());
  expect(mockCopy).toHaveBeenCalledWith({
    from: 'file:///picker/photo.png',
    to: expect.stringContaining('file:///app/avatars/'),
  });
  expect(result.current.profile?.avatarUri).toBe('file:///saved/avatar.jpg');
});
test('picker failure shows an error and releases busy state', async () => {
  const { result } = renderHook(useAccount);
  await waitFor(() => expect(result.current.profile).not.toBeNull());
  mockPick.mockRejectedValue(new Error('denied'));
  await act(async () => result.current.changeAvatar());
  expect(result.current.notice?.variant).toBe('error');
  expect(result.current.busy).toBe(false);
  expect(mockRepository.updateAccountAvatar).not.toHaveBeenCalled();
});
