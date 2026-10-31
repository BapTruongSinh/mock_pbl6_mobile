import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MyDemoTicketsScreen } from './MyDemoTicketsScreen';
import { INITIAL_BOOKING } from './bookingModel';
jest.mock('../auth/useSession', () => ({
  useSession: () => ({ session: { accountId: 'TEST', role: 'customer' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
jest.mock('./LocalQr', () => ({ LocalQr: () => null }));
jest.mock('./ticketExport', () => ({ saveTicketImage: jest.fn().mockResolvedValue(undefined) }));
const fixture = {
  id: 'T1',
  accountId: 'TEST',
  issuedAt: 1,
  booking: {
    ...INITIAL_BOOKING,
    stage: 'ticket' as const,
    seats: ['B01'],
    passengers: { B01: { fullName: 'Minh Anh', phone: '0901234567' } },
  },
};
test('list opens shared detail with downloads and back returns to list', async () => {
  const v = render(
    <MyDemoTicketsScreen onNavigate={jest.fn()} onLogin={jest.fn()} reviewTickets={[fixture]} />,
  );
  expect(v.getByTestId('screen.FIGMA-635-45')).toBeTruthy();
  fireEvent.press(v.getByTestId('tickets.open.T1'));
  expect(v.getByTestId('ticket.download')).toBeTruthy();
  expect(v.getByTestId('ticket.cancel')).toBeTruthy();
  fireEvent.press(v.getByTestId('booking.back'));
  expect(v.getByTestId('screen.FIGMA-635-45')).toBeTruthy();
  fireEvent.press(v.getByTestId('tickets.filter.past'));
  expect(v.queryByTestId('tickets.open.T1')).toBeNull();
  fireEvent.press(v.getByTestId('tickets.filter.upcoming'));
  expect(v.getByTestId('tickets.open.T1')).toBeTruthy();
});
