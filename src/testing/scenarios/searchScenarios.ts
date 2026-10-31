import React from 'react';
import { setReviewTripId } from './bookingScenarios';
import { SearchResultsScreen } from '../../features/search/SearchResultsScreen';
import { hasScenario, registerScenario, launchScenario } from './registry';
let generation = 0;
export function ensureSearchScenariosRegistered(): void {
  for (const id of ['FIGMA-31-44', 'FIGMA-486-279']) {
    if (!hasScenario(id))
      registerScenario({
        id,
        route: 'SearchResults',
        reset: () => {
          generation += 1;
        },
        expectedTestIds: ['screen.FIGMA-31-44'],
        render: () =>
          React.createElement(SearchResultsScreen, {
            key: `${id}-${generation}`,
            onSelectTrip: (id) => {
              setReviewTripId(id);
              void launchScenario('FIGMA-31-89');
            },
            onAccount: () => {
              void launchScenario('NEW-CUSTOMER-ACCOUNT');
            },
            onTickets: () => {
              void launchScenario('FIGMA-635-45');
            },
            initialFilterOpen: id === 'FIGMA-486-279',
            onBack: () => {
              void launchScenario('FIGMA-31-2');
            },
            onHome: () => {
              void launchScenario('FIGMA-31-2');
            },
          }),
      });
  }
}
