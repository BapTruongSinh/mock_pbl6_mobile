import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GuestMenuScreen } from './GuestMenuScreen';
import { GuestTicketLookupScreen } from './GuestTicketLookupScreen';
function wrap(children: React.ReactNode): React.ReactElement {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}
test('guest menu exposes two actions and opens manual lookup', () => {
  const lookup = jest.fn();
  const trips = jest.fn();
  const view = render(wrap(<GuestMenuScreen onLookup={lookup} onViewTrips={trips} />));
  fireEvent.press(view.getByTestId('guest.menu.lookup'));
  expect(lookup).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByTestId('guest.menu.trips'));
  expect(trips).toHaveBeenCalledTimes(1);
  expect(view.getByText('Tra cứu vé')).toBeTruthy();
  expect(view.getByText('Xem chuyến')).toBeTruthy();
});
test('lookup keeps code and booking phone editable and QR is a separate action without OTP', () => {
  const qr = jest.fn();
  const view = render(wrap(<GuestTicketLookupScreen onScanQr={qr} />));
  fireEvent.changeText(view.getByTestId('guest.lookup.ticketCode'), 'BLUE123');
  fireEvent.changeText(view.getByTestId('guest.lookup.bookingPhone'), '0901234567');
  expect(view.getByTestId('guest.lookup.ticketCode').props.value).toBe('BLUE123');
  expect(view.getByTestId('guest.lookup.bookingPhone').props.value).toBe('0901234567');
  fireEvent.press(view.getByTestId('guest.lookup.qr'));
  expect(qr).toHaveBeenCalledTimes(1);
  expect(view.queryByText('OTP')).toBeNull();
});
test('manual lookup requires both inputs and does not invent a result', async () => {
  const view = render(wrap(<GuestTicketLookupScreen />));
  await act(async () => fireEvent.press(view.getByTestId('guest.lookup.submit')));
  expect(view.getByText('Vui lòng nhập mã vé và số điện thoại đặt vé')).toBeTruthy();
  fireEvent.changeText(view.getByTestId('guest.lookup.ticketCode'), 'BLUE123');
  fireEvent.changeText(view.getByTestId('guest.lookup.bookingPhone'), '0901234567');
  await act(async () => fireEvent.press(view.getByTestId('guest.lookup.submit')));
  expect(
    view.getByText('Bạn đã nhập đủ thông tin. Kết quả tra cứu sẽ được bổ sung ở bước tiếp theo.'),
  ).toBeTruthy();
});
