jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  writeAsStringAsync: jest.fn(async () => undefined),
  moveAsync: jest.fn(async () => undefined),
}));
import { createTestWorld } from '../../testing/createTestWorld';
import { createDriverScheduleRepository } from './driverScheduleRepository';
import { resolveEntry } from '../../navigation/guards';
test('driver demo logs in to Driver, wrong password rejected', async () => {
  const repository = createTestWorld().repository;
  const result = await repository.login({ identifier: 'b@gmail.com', password: '12345678' });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(resolveEntry(result.value)).toBe('Driver');
  expect((await repository.login({ identifier: 'b@gmail.com', password: 'wrong' })).ok).toBe(false);
});
test('schedule rejects customer, separates tabs, removes revoked assignment', async () => {
  const world = createTestWorld();
  const auth = await world.repository.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!auth.ok) throw Error('driver missing');
  const schedule = createDriverScheduleRepository(world.repository);
  expect((await schedule.load(world.sessions.customer, 'today')).ok).toBe(false);
  expect(await schedule.load(world.sessions.driver, 'today')).toEqual({ ok: true, value: [] });
  const today = await schedule.load(auth.value, 'today');
  expect(today.ok && today.value.map((t) => t.id)).toEqual(['TR-204', 'TR-218']);
  const upcoming = await schedule.load(auth.value, 'upcoming');
  expect(upcoming.ok && upcoming.value[0]?.id).toBe('TR-218');
  const past = await schedule.load(auth.value, 'completed');
  expect(past.ok && past.value).toEqual([]);
  schedule.revoke('TR-204');
  const refreshed = await schedule.load(auth.value, 'today');
  expect(refreshed.ok && refreshed.value.some((t) => t.id === 'TR-204')).toBe(false);
});
