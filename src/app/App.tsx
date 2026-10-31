import { ensureDriverActionScenariosRegistered } from '../testing/scenarios/driverActionScenarios';
import { ensureDriverManifestScenariosRegistered } from '../testing/scenarios/driverManifestScenarios';
import { ensureDriverDetailScenariosRegistered } from '../testing/scenarios/driverDetailScenarios';
import { ensureDriverScenariosRegistered } from '../testing/scenarios/driverScenarios';
import { ensureAccountScenarioRegistered } from '../testing/scenarios/accountScenarios';
import { ensureSearchScenariosRegistered } from '../testing/scenarios/searchScenarios';
import { ensureBookingScenariosRegistered } from '../testing/scenarios/bookingScenarios';
import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProviders } from './providers/AppProviders';
import { FoundationBootstrapView } from './FoundationBootstrapView';
import { handleHarnessDeepLink } from '../testing/nativeHarness';
import { ensureFoundationSmokeScenarioRegistered } from '../testing/scenarios/FOUNDATION-SMOKE';
import { ensureRegisterScenarioRegistered } from '../testing/scenarios/FIGMA-64-638';
import { ensureLoginScenarioRegistered } from '../testing/scenarios/FIGMA-64-634';
import {
  getActiveScenarioId,
  getScenario,
  hasScenario,
  subscribeScenarioLaunch,
} from '../testing/scenarios/registry';
import { ensureGuestScenariosRegistered } from '../testing/scenarios/guestScenarios';
import { ensureWelcomeScenarioRegistered } from '../testing/scenarios/FIGMA-650-4';
import { RootNavigator } from '../navigation/RootNavigator';

export { FoundationBootstrapView };

export function App(): React.ReactElement {
  const [activeCase, setActiveCase] = useState<string | null>(getActiveScenarioId);

  useEffect(() => {
    ensureFoundationSmokeScenarioRegistered();
    ensureLoginScenarioRegistered();
    ensureRegisterScenarioRegistered();
    ensureGuestScenariosRegistered();
    ensureWelcomeScenarioRegistered();
    ensureSearchScenariosRegistered();
    ensureBookingScenariosRegistered();
    ensureDriverScenariosRegistered();
    ensureDriverDetailScenariosRegistered();
    ensureDriverActionScenariosRegistered();
    ensureDriverManifestScenariosRegistered();
    ensureAccountScenarioRegistered();

    void Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          return handleHarnessDeepLink(initialUrl);
        }
        return undefined;
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', (event) => {
      if (event?.url) {
        void handleHarnessDeepLink(event.url).catch(() => undefined);
      }
    });

    const unsubscribeLaunch = subscribeScenarioLaunch((caseId) => {
      setActiveCase(caseId);
    });

    return () => {
      subscription.remove();
      unsubscribeLaunch();
    };
  }, []);

  const renderContent = (): React.ReactElement => {
    if (activeCase === 'FOUNDATION-SMOKE') {
      return <FoundationBootstrapView />;
    }
    if (activeCase && hasScenario(activeCase)) {
      const scenario = getScenario(activeCase);
      if (scenario.render) {
        return scenario.render();
      }
    }
    return <RootNavigator />;
  };

  return (
    <AppProviders>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>{renderContent()}</SafeAreaProvider>
    </AppProviders>
  );
}

export default App;
