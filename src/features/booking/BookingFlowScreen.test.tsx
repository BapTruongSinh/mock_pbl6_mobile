import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingFlowScreen } from './BookingFlowScreen';
import { CustomerBottomNav } from '../../shared/components/CustomerBottomNav';
let mockSession: { accountId: string; role: string } | null = {
  accountId: 'TEST-CUSTOMER',
  role: 'customer',
};
jest.mock('../auth/useSession', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('../auth/LoginScreen', () => ({
  LoginScreen: ({ onLoginSuccess }: { onLoginSuccess: (r: string) => void }) => {
    const { Pressable, Text } = jest.requireActual('react-native');
    return (
      <Pressable
        testID="login.test"
        onPress={() => {
          mockSession = { accountId: 'TEST-CUSTOMER', role: 'customer' };
          onLoginSuccess('customer');
        }}
      >
        <Text>Test Login</Text>
      </Pressable>
    );
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
jest.mock('./LocalQr', () => ({ LocalQr: () => null }));
beforeEach(() => {
  jest.useFakeTimers();
  mockSession = { accountId: 'TEST-CUSTOMER', role: 'customer' };
});
afterEach(() => jest.useRealTimers());
test('customer tabs expose only four items with exactly one active', () => {
  const v = render(<CustomerBottomNav active="search" />);
  expect(v.getAllByRole('tab')).toHaveLength(4);
  expect(v.queryByLabelText('Hành trình')).toBeNull();
  expect(v.getAllByRole('tab').filter((t) => t.props.accessibilityState?.selected)).toHaveLength(1);
});
test('two selected seats have independent editable passengers and manual transfer waits for confirmation', () => {
  const v = render(<BookingFlowScreen onBack={jest.fn()} />);
  fireEvent.press(v.getByTestId('booking.seat.B01'));
  fireEvent.press(v.getByTestId('booking.seat.B02'));
  fireEvent.press(v.getByTestId('booking.seats.continue'));
  fireEvent.press(v.getByTestId('booking.passengers.continue'));
  expect(v.getByText(/Vui lòng nhập họ tên/)).toBeTruthy();
  for (const [seat, name, phone] of [
    ['B01', 'Minh Anh', '0901234567'],
    ['B02', 'Gia Huy', '0907654321'],
  ]) {
    fireEvent.press(v.getByTestId(`booking.passenger.${seat}`));
    fireEvent.changeText(v.getByTestId('booking.passenger.name'), name);
    fireEvent.changeText(v.getByTestId('booking.passenger.phone'), phone);
    fireEvent.press(v.getByTestId('booking.passenger.save'));
  }
  fireEvent.press(v.getByTestId('booking.passengers.continue'));
  expect(v.getByTestId('screen.NEW-VNPAY-QR')).toBeTruthy();
  fireEvent.press(v.getByTestId('booking.payment.reported'));
  expect(v.queryByTestId('screen.FIGMA-31-183')).toBeNull();
  expect(v.getByTestId('screen.FIGMA-31-172')).toBeTruthy();
  fireEvent.press(v.getByTestId('booking.payment.confirmed'));
  expect(v.getByTestId('screen.FIGMA-31-183')).toBeTruthy();
  expect(v.getByText('Minh Anh')).toBeTruthy();
  expect(v.getByText('Gia Huy')).toBeTruthy();
});
test('guest login preserves selected seats and does not reset hold', () => {
  mockSession = null;
  const v = render(<BookingFlowScreen onBack={jest.fn()} />);
  fireEvent.press(v.getByTestId('booking.seat.B01'));
  fireEvent.press(v.getByTestId('booking.seat.B02'));
  fireEvent.press(v.getByTestId('booking.seats.continue'));
  expect(v.getByTestId('login.test')).toBeTruthy();
  fireEvent.press(v.getByTestId('login.test'));
  expect(v.getByTestId('booking.passenger.B01')).toBeTruthy();
  expect(v.getByTestId('booking.passenger.B02')).toBeTruthy();
});

test('active tickets tab routes to list from issued detail', () => {
  const navigate = jest.fn();
  const v = render(
    <BookingFlowScreen onBack={jest.fn()} onNavigate={navigate} reviewStage="ticket" />,
  );
  fireEvent.press(v.getByTestId('customer.tab.tickets'));
  expect(navigate).toHaveBeenCalledWith('tickets');
});
test('BLUE Express booking uses its own price and vehicle rather than Nguyen Kim', () => {
  const v = render(<BookingFlowScreen onBack={jest.fn()} tripId="BL201" />);
  expect(v.getByText('Giường nằm 40 chỗ')).toBeTruthy();
  fireEvent.press(v.getByTestId('booking.seat.B01'));
  expect(v.getByText('320.000đ')).toBeTruthy();
});
