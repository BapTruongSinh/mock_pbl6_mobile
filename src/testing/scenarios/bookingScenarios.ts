import React from 'react';
import { CancellationFlow } from '../../features/cancellation/CancellationFlow';
import type { CancellationStage } from '../../features/cancellation/cancellationModel';
import { MyDemoTicketsScreen } from '../../features/booking/MyDemoTicketsScreen';
import { INITIAL_BOOKING } from '../../features/booking/bookingModel';
import { BookingFlowScreen } from '../../features/booking/BookingFlowScreen';
import type { BookingStage } from '../../features/booking/bookingModel';
import { hasScenario, registerScenario, launchScenario } from './registry';
let generation = 0;
let reviewTripId = 'NK118';
export function setReviewTripId(id: string): void {
  reviewTripId = id;
}
export function ensureBookingScenariosRegistered(): void {
  const cancellationCases: [string, CancellationStage, string[]][] = [
    ['FIGMA-1110-4', 'select', ['B01', 'B02']],
    ['FIGMA-1113-4', 'select', ['B01']],
    ['FIGMA-1113-205', 'select', ['B02']],
    ['FIGMA-1113-406', 'select', []],
    ['FIGMA-1113-607', 'preview', ['B01']],
    ['NEW-CANCEL-PENDING', 'cancelling', ['B01']],
    ['FIGMA-1113-804', 'refunding', ['B01']],
    ['NEW-REFUND-SUCCESS', 'refunded', ['B01']],
  ];
  for (const [id, stage, seats] of cancellationCases)
    if (!hasScenario(id))
      registerScenario({
        id,
        route: 'CancellationSelection',
        expectedTestIds: [`screen.cancellation.${stage}`],
        reset: () => {
          generation += 1;
        },
        render: () =>
          React.createElement(CancellationFlow, {
            key: `${id}-${generation}`,
            booking: {
              ...INITIAL_BOOKING,
              seats: ['B01', 'B02'],
              passengers: {
                B01: { fullName: 'Nguyễn Minh Anh', phone: '0900000218' },
                B02: { fullName: 'Trần Gia Huy', phone: '0900000762' },
              },
            },
            reviewStage: stage,
            reviewSelected: seats,
            onClose: () => {
              void launchScenario('FIGMA-635-45');
            },
            onUpdate: () => undefined,
          }),
      });

  if (!hasScenario('FIGMA-635-45'))
    registerScenario({
      id: 'FIGMA-635-45',
      route: 'DemoTickets',
      expectedTestIds: ['screen.FIGMA-635-45'],
      reset: () => {
        generation += 1;
      },
      render: () =>
        React.createElement(MyDemoTicketsScreen, {
          key: generation,
          onLogin: () => {
            void launchScenario('FIGMA-64-634');
          },
          onNavigate: (tab) => {
            void launchScenario(
              tab === 'home'
                ? 'FIGMA-31-2'
                : tab === 'account'
                  ? 'NEW-CUSTOMER-ACCOUNT'
                  : 'FIGMA-31-44',
            );
          },
          reviewTickets: [
            {
              id: 'NK-REVIEW',
              accountId: 'REVIEW',
              issuedAt: 0,
              booking: {
                ...INITIAL_BOOKING,
                stage: 'ticket',
                seats: ['B01', 'B02'],
                passengers: {
                  B01: { fullName: 'Nguyễn Minh Anh', phone: '0900000218' },
                  B02: { fullName: 'Trần Gia Huy', phone: '0900000762' },
                },
              },
            },
          ],
        }),
    });
  const cases: [string, BookingStage][] = [
    ['FIGMA-31-89', 'seats'],
    ['FIGMA-37-127', 'passengers'],
    ['NEW-VNPAY-QR', 'qr'],
    ['FIGMA-31-172', 'processing'],
    ['FIGMA-31-183', 'ticket'],
  ];
  for (const [id, stage] of cases)
    if (!hasScenario(id))
      registerScenario({
        id,
        route: 'BookingFlow',
        expectedTestIds: [`screen.${id}`],
        reset: () => {
          generation += 1;
        },
        render: () =>
          React.createElement(BookingFlowScreen, {
            key: `${id}-${generation}`,
            reviewStage: stage,
            tripId: reviewTripId,
            onBack: () => {
              void launchScenario('FIGMA-31-44');
            },
            onNavigate: (tab) => {
              void launchScenario(
                tab === 'account'
                  ? 'NEW-CUSTOMER-ACCOUNT'
                  : tab === 'home'
                    ? 'FIGMA-31-2'
                    : tab === 'search'
                      ? 'FIGMA-31-44'
                      : 'FIGMA-635-45',
              );
            },
          }),
      });
}
