jest.mock('../../features/driver/DriverManifestScreen', () => ({
  DriverManifestScreen: () => null,
}));
import { ensureDriverManifestScenariosRegistered } from './driverManifestScenarios';
import { getScenario } from './registry';
test('every passenger and check-in frame plus lifecycle gates has an executable review case', () => {
  ensureDriverManifestScenariosRegistered();
  for (const id of [
    '1137-18',
    '1137-100',
    '1137-182',
    '1137-264',
    '1137-345',
    '1137-422',
    '1137-501',
    '996-102',
    '1138-681',
    '1138-18',
    '35-54',
    '1138-91',
    '35-78',
    '1138-165',
    '1138-239',
    '1138-313',
    '1138-387',
    '1138-461',
    '1138-535',
    '1138-608',
  ]
    .map((n) => 'FIGMA-' + n)
    .concat(['MANIFEST-READONLY', 'MANIFEST-ARRIVED', 'MANIFEST-COMPLETED'])) {
    expect(getScenario(id).expectedTestIds).toContain('driver.detail.title');
    expect(getScenario(id).render).toBeDefined();
  }
});
