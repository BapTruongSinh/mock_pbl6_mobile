import { createTestWorld } from '../../testing/createTestWorld';
import { createDriverTripRepository, createMemoryTripStorage } from './driverTripRepository';
import {
  createManifestRepository,
  filterManifest,
  createMemoryManifestStorage,
} from './driverManifestRepository';
test('check-in allowed only boarding/travelling; duplicate scan once; filter and stale version', async () => {
  const authority = createTestWorld().repository;
  const auth = await authority.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!auth.ok) throw Error('driver');
  const trips = createDriverTripRepository(authority, {
    storage: createMemoryTripStorage(),
    now: () => Date.parse('2026-08-28T11:00:00+07:00'),
  });
  const repo = createManifestRepository(trips, createMemoryManifestStorage());
  let data = await repo.load('TR-204', auth.value);
  if (!data.ok) throw Error('manifest');
  expect(
    (await repo.check('TR-204', 'TVL-9K2C-7M4Q', data.value.version, 'op1', auth.value)).outcome,
  ).toBe('forbidden');
  await trips.advance('TR-204', 'boarding', 0, auth.value);
  data = await repo.load('TR-204', auth.value);
  if (!data.ok) throw Error('manifest');
  expect(
    filterManifest(data.value.passengers, ['mien-dong'], 'pending').every(
      (p) => p.pickupId === 'mien-dong' && !p.checkedIn,
    ),
  ).toBe(true);
  const result = await repo.check('TR-204', 'TVL-9K2C-7M4Q', data.value.version, 'op2', auth.value);
  expect(result.outcome).toBe('success');
  expect(
    (await repo.check('TR-204', 'TVL-9K2C-7M4Q', data.value.version, 'op2', auth.value)).outcome,
  ).toBe('success');
  data = await repo.load('TR-204', auth.value);
  if (!data.ok) throw Error('manifest');
  expect(
    (await repo.check('TR-204', 'TVL-9K2C-7M4Q', data.value.version, 'op3', auth.value)).outcome,
  ).toBe('already');
  expect((await repo.check('TR-204', 'TVL-AAAA-0003', 0, 'stale', auth.value)).outcome).toBe(
    'stale',
  );
});
test('invalid/wrongTrip/cancelled/refunded/used/role cases never record boarding', async () => {
  const authority = createTestWorld().repository;
  const auth = await authority.login({ identifier: 'b@gmail.com', password: '12345678' });
  if (!auth.ok) throw Error('driver');
  const trips = createDriverTripRepository(authority, { storage: createMemoryTripStorage() });
  await trips.advance('TR-204', 'boarding', 0, auth.value);
  const repo = createManifestRepository(trips, createMemoryManifestStorage());
  const data = await repo.load('TR-204', auth.value);
  if (!data.ok) throw Error('manifest');
  for (const [code, outcome] of [
    ['invalid', 'invalid'],
    ['TVL-WRNG-0001', 'wrongTrip'],
    ['TVL-CNCL-0001', 'cancelled'],
    ['TVL-RFND-0001', 'refunded'],
    ['TVL-USED-0001', 'used'],
  ])
    expect(
      (await repo.check('TR-204', code ?? '', data.value.version, code ?? '', auth.value)).outcome,
    ).toBe(outcome);
  await authority.logout(auth.value);
  expect((await repo.load('TR-204', auth.value)).ok).toBe(false);
});
