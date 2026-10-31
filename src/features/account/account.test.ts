import { createTestWorld } from '../../testing/createTestWorld';
import { createInMemoryMockAuthStorage } from '../../repositories/mock/mockAuthStorage';

describe('account profile and credentials', () => {
  it('returns registration fields without credentials and rejects a forged owner', async () => {
    const { repository } = createTestWorld();
    const login = await repository.register({
      fullName: 'Khách thử',
      email: 'profile@example.com',
      phone: '0900000111',
      password: 'original123',
    });
    if (!login.ok) throw new Error(login.message);
    const profile = await repository.getAccountProfile(login.value);
    expect(profile).toEqual({
      ok: true,
      value: {
        accountId: login.value.accountId,
        fullName: 'Khách thử',
        email: 'profile@example.com',
        phone: '0900000111',
      },
    });
    expect(
      (await repository.getAccountProfile({ ...login.value, accountId: 'CUSTOMER-1' })).ok,
    ).toBe(false);
  });
  it('checks current password and persists a seeded account password and avatar across restart', async () => {
    const authStorage = createInMemoryMockAuthStorage();
    const { repository } = createTestWorld({ authStorage });
    const login = await repository.login({ identifier: 'a@gmail.com', password: '12345678' });
    if (!login.ok) throw new Error(login.message);
    expect((await repository.changePassword(login.value, 'wrong', 'newPassword123')).ok).toBe(
      false,
    );
    expect((await repository.changePassword(login.value, '12345678', 'short')).ok).toBe(false);
    expect((await repository.changePassword(login.value, '12345678', 'newPassword123')).ok).toBe(
      true,
    );
    expect((await repository.updateAccountAvatar(login.value, 'file:///mock/avatar.jpg')).ok).toBe(
      true,
    );
    const restarted = createTestWorld({ authStorage }).repository;
    expect((await restarted.login({ identifier: 'a@gmail.com', password: '12345678' })).ok).toBe(
      false,
    );
    const next = await restarted.login({ identifier: 'a@gmail.com', password: 'newPassword123' });
    if (!next.ok) throw new Error(next.message);
    const profile = await restarted.getAccountProfile(next.value);
    expect(profile.ok && profile.value.avatarUri).toBe('file:///mock/avatar.jpg');
  });
});
