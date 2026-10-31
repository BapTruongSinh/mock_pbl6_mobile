import { createTestWorld } from '../../testing/createTestWorld';
test('Minh Anh authenticates only with exact demo credentials', async () => {
  const world = createTestWorld({ caseId: 'MINH-ANH-LOGIN' });
  await world.repository.initialize();
  const ok = await world.repository.login({ identifier: 'a@gmail.com', password: '12345678' });
  expect(ok.ok).toBe(true);
  if (ok.ok) {
    expect(ok.value.accountId).toBe('CUSTOMER-MINH-ANH');
    expect(ok.value.role).toBe('customer');
  }
  expect(
    (await world.repository.login({ identifier: 'a@gmail.com', password: 'wrongpass' })).ok,
  ).toBe(false);
  expect(
    (await world.repository.login({ identifier: 'wrong@gmail.com', password: '12345678' })).ok,
  ).toBe(false);
});
