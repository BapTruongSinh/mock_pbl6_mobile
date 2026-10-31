import { createTestWorld } from '../../testing/createTestWorld';
import { createInMemoryMockAuthStorage } from '../../repositories/mock/mockAuthStorage';
test('customer edits contacts and birth date, email login migrates and survives restart', async () => {
  const authStorage = createInMemoryMockAuthStorage();
  const repo = createTestWorld({ authStorage }).repository;
  const auth = await repo.login({ identifier: 'a@gmail.com', password: '12345678' });
  if (!auth.ok) throw Error('login');
  expect(
    (
      await repo.updateAccountProfile(auth.value, {
        email: 'new@example.com',
        phone: '0900000222',
        dateOfBirth: '2000-02-29',
      })
    ).ok,
  ).toBe(true);
  const restarted = createTestWorld({ authStorage }).repository;
  expect((await restarted.login({ identifier: 'a@gmail.com', password: '12345678' })).ok).toBe(
    false,
  );
  const next = await restarted.login({ identifier: 'new@example.com', password: '12345678' });
  if (!next.ok) throw Error('new login');
  const p = await restarted.getAccountProfile(next.value);
  expect(p.ok && p.value.dateOfBirth).toBe('2000-02-29');
  expect((await repo.updateAccountProfile(auth.value, { dateOfBirth: '2025-02-30' })).ok).toBe(
    false,
  );
  expect((await repo.updateAccountProfile(auth.value, { email: 'b@gmail.com' })).ok).toBe(false);
});
test('driver contact restrictions enforced in repository, email remains editable', async () => {
  const repo = createTestWorld().repository;
  const auth = await repo.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!auth.ok) throw Error('login');
  expect((await repo.updateAccountProfile(auth.value, { phone: '0900000222' })).ok).toBe(false);
  expect((await repo.updateAccountProfile(auth.value, { dateOfBirth: '1990-01-01' })).ok).toBe(
    false,
  );
  expect((await repo.updateAccountProfile(auth.value, { email: 'driver@example.com' })).ok).toBe(
    true,
  );
});

test('profile save failure rolls back email and phone identity', async () => {
  const storage = createInMemoryMockAuthStorage();
  const repo = createTestWorld({ authStorage: storage }).repository;
  const login = await repo.login({ identifier: 'a@gmail.com', password: '12345678' });
  if (!login.ok) throw Error('login');
  const spy = jest.spyOn(storage, 'save').mockRejectedValueOnce(new Error('disk'));
  expect((await repo.updateAccountProfile(login.value, { email: 'rollback@example.com' })).ok).toBe(
    false,
  );
  spy.mockRestore();
  expect((await repo.login({ identifier: 'a@gmail.com', password: '12345678' })).ok).toBe(true);
  expect((await repo.login({ identifier: 'rollback@example.com', password: '12345678' })).ok).toBe(
    false,
  );
});
