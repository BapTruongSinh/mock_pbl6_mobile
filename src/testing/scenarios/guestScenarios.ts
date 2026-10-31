import React from 'react';
import { GuestScanScreen } from '../../features/guest/GuestScanScreen';
import { GuestMenuScreen } from '../../features/guest/GuestMenuScreen';
import { GuestTicketLookupScreen } from '../../features/guest/GuestTicketLookupScreen';
import { hasScenario, registerScenario, launchScenario } from './registry';
let generation = 0;
export function ensureGuestScenariosRegistered(): void {
  if (!hasScenario('NEW-GUEST-SCAN'))
    registerScenario({
      id: 'NEW-GUEST-SCAN',
      route: 'GuestScan',
      reset: () => {
        generation += 1;
      },
      expectedTestIds: ['screen.NEW-GUEST-SCAN', 'guest.scan.ticketCode', 'guest.scan.manual'],
      render: () =>
        React.createElement(GuestScanScreen, {
          key: generation,
          onBack: () => {
            void launchScenario('NEW-GUEST-LOOKUP');
          },
        }),
    });
  if (!hasScenario('NEW-GUEST-MENU'))
    registerScenario({
      id: 'NEW-GUEST-MENU',
      route: 'GuestMenu',
      reset: () => {
        generation += 1;
      },
      expectedTestIds: ['screen.NEW-GUEST-MENU', 'guest.menu.lookup', 'guest.menu.trips'],
      render: () =>
        React.createElement(GuestMenuScreen, {
          key: generation,
          onViewTrips: () => {
            void launchScenario('FIGMA-31-44');
          },
          onLookup: () => {
            void launchScenario('NEW-GUEST-LOOKUP');
          },
          onBack: () => {
            void launchScenario('FIGMA-64-634');
          },
        }),
    });
  if (!hasScenario('NEW-GUEST-LOOKUP'))
    registerScenario({
      id: 'NEW-GUEST-LOOKUP',
      route: 'GuestTicketLookup',
      reset: () => {
        generation += 1;
      },
      expectedTestIds: [
        'screen.NEW-GUEST-LOOKUP',
        'guest.lookup.ticketCode',
        'guest.lookup.bookingPhone',
        'guest.lookup.qr',
      ],
      render: () =>
        React.createElement(GuestTicketLookupScreen, {
          key: generation,
          onScanQr: () => {
            void launchScenario('NEW-GUEST-SCAN');
          },
          onBack: () => {
            void launchScenario('NEW-GUEST-MENU');
          },
        }),
    });
}
