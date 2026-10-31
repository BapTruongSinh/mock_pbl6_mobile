jest.mock('../../features/driver/DriverTripDetailScreen', () => ({
  DriverTripDetailScreen: () => null,
}));
import { ensureDriverDetailScenariosRegistered } from './driverDetailScenarios';
import { getScenario } from './registry';
test('every driver detail frame has an executable review case', () => {
  ensureDriverDetailScenariosRegistered();
  for (const node of [
    '1139-18',
    '35-28',
    '1139-184',
    '1139-267',
    '1139-350',
    '1146-888',
    '1146-964',
    '1146-1042',
  ]) {
    const scenario = getScenario('FIGMA-' + node);
    expect(scenario.expectedTestIds).toContain('screen.driverDetail.' + node);
    expect(scenario.render).toBeDefined();
  }
});
