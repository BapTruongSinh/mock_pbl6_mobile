import { createTestWorld } from '../../testing/createTestWorld';
import { createDriverTripRepository, createMemoryTripStorage } from './driverTripRepository';
test('time gates, sequence and persisted completed trip; next trip released', async () => {
  const authority = createTestWorld().repository;
  const login = await authority.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!login.ok) throw Error('driver');
  const session = login.value;
  let now = Date.parse('2026-08-28T10:36:00+07:00');
  const storage = createMemoryTripStorage();
  const repo = createDriverTripRepository(authority, { storage, now: () => now });
  let detail = await repo.get('TR-204', session);
  if (!detail.ok) throw Error('missing');
  expect((await repo.advance('TR-204', 'travelling', detail.value.version, session)).ok).toBe(
    false,
  );
  detail = await repo.advance('TR-204', 'boarding', detail.value.version, session);
  if (!detail.ok) throw Error(detail.message);
  expect((await repo.advance('TR-218', 'boarding', 0, session)).ok).toBe(false);
  expect((await repo.advance('TR-204', 'travelling', detail.value.version, session)).ok).toBe(
    false,
  );
  now = Date.parse('2026-08-28T11:20:00+07:00');
  detail = await repo.advance('TR-204', 'travelling', detail.value.version, session);
  if (!detail.ok) throw Error(detail.message);
  now = Date.parse('2026-08-28T17:00:00+07:00');
  expect((await repo.advance('TR-204', 'arrived', detail.value.version, session)).ok).toBe(false);
  now = Date.parse('2026-08-28T17:20:00+07:00');
  detail = await repo.advance('TR-204', 'arrived', detail.value.version, session);
  if (!detail.ok) throw Error(detail.message);
  detail = await repo.advance('TR-204', 'completed', detail.value.version, session);
  expect(detail.ok).toBe(true);
  const restored = createDriverTripRepository(authority, { storage, now: () => now });
  const saved = await restored.get('TR-204', session);
  expect(saved.ok && saved.value.stage).toBe('completed');
  expect((await restored.advance('TR-218', 'boarding', 0, session)).ok).toBe(true);
});
test('ownership, logout, revoked assignment and stale version cannot mutate', async () => {
  const world = createTestWorld();
  const login = await world.repository.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!login.ok) throw Error('driver');
  const repo = createDriverTripRepository(world.repository, { storage: createMemoryTripStorage() });
  expect((await repo.get('TR-204', world.sessions.customer)).ok).toBe(false);
  expect((await repo.get('TR-204', world.sessions.driver)).ok).toBe(false);
  expect((await repo.advance('TR-204', 'boarding', 9, login.value)).ok).toBe(false);
  repo.revoke('TR-204');
  expect((await repo.get('TR-204', login.value)).ok).toBe(false);
  await world.repository.logout(login.value);
  expect((await repo.get('TR-218', login.value)).ok).toBe(false);
});

test('simultaneous duplicate action succeeds once; storage failure cannot advance state', async () => {
  const authority = createTestWorld().repository;
  const auth = await authority.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!auth.ok) throw Error('driver');
  const storage = createMemoryTripStorage();
  let fail = true;
  const repo = createDriverTripRepository(authority, {
    storage: {
      load: storage.load,
      save: async (value) => {
        if (fail) throw Error('disk');
        await storage.save(value);
      },
    },
  });
  expect((await repo.advance('TR-204', 'boarding', 0, auth.value)).ok).toBe(false);
  const unchanged = await repo.get('TR-204', auth.value);
  expect(unchanged.ok && unchanged.value.stage).toBe('scheduled');
  fail = false;
  const results = await Promise.all([
    repo.advance('TR-204', 'boarding', 0, auth.value),
    repo.advance('TR-204', 'boarding', 0, auth.value),
  ]);
  expect(results.filter((result) => result.ok)).toHaveLength(1);
});
