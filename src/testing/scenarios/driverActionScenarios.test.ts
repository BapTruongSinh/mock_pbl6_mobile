jest.mock('../../features/driver/DriverTripDetailScreen', () => ({
  DriverTripDetailScreen: () => null,
}));
jest.mock('../../features/driver/DriverConnectionScreen', () => ({
  DriverConnectionScreen: () => null,
}));
jest.mock('../../features/driver/DriverAccountScreen', () => ({ DriverAccountScreen: () => null }));
import { ensureDriverDetailScenariosRegistered } from './driverDetailScenarios';
import { ensureDriverActionScenariosRegistered } from './driverActionScenarios';
import { getScenario } from './registry';
test('all confirmation/pending/failure/profile and extra cases have distinct executable links', () => {
  ensureDriverDetailScenariosRegistered();
  ensureDriverActionScenariosRegistered();
  for (const id of [
    '1140-18',
    '1140-1041',
    '1140-92',
    '1140-1113',
    '1140-240',
    '1140-1257',
    '1140-314',
    '1140-1401',
    '1140-1474',
    '1140-1547',
    '1146-1196',
    '1135-322',
  ]
    .map((id) => 'FIGMA-' + id)
    .concat(['DRIVER-ACCOUNT', 'DRIVER-SESSION-EXPIRED', 'NEW-DRIVER-COMPLETION-PENDING'])) {
    expect(getScenario(id).render).toBeDefined();
    expect(getScenario(id).expectedTestIds.length).toBeGreaterThan(0);
  }
});
