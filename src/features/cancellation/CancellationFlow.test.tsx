import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CancellationFlow } from './CancellationFlow';
import { INITIAL_BOOKING } from '../booking/bookingModel';
jest.mock('../auth/useSession', () => ({
  useSession: () => ({ session: { accountId: 'TEST', role: 'customer' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
const booking = {
  ...INITIAL_BOOKING,
  seats: ['B01', 'B02'],
  passengers: {
    B01: { fullName: 'Minh Anh', phone: '0901234567' },
    B02: { fullName: 'Gia Huy', phone: '0907654321' },
  },
};
test('select -> preview keeps unselected ticket, cancellation and refund require distinct events', () => {
  const update = jest.fn();
  const v = render(<CancellationFlow booking={booking} onClose={jest.fn()} onUpdate={update} />);
  fireEvent.press(v.getByTestId('cancel.preview'));
  expect(v.queryByTestId('cancel.confirm')).toBeNull();
  fireEvent.press(v.getByTestId('cancel.seat.B01'));
  fireEvent.press(v.getByTestId('cancel.preview'));
  expect(v.getByText('Không hủy — Giữ nguyên vé')).toBeTruthy();
  fireEvent.press(v.getByTestId('cancel.confirm'));
  expect(v.getByTestId('screen.cancellation.cancelling')).toBeTruthy();
  expect(update).toHaveBeenLastCalledWith(
    expect.objectContaining({ refundRequest: { seats: ['B01'], stage: 'cancelling' } }),
  );
  expect(update.mock.calls[0]?.[0].cancelledSeats).toBeUndefined();
  fireEvent.press(v.getByTestId('cancel.backendConfirmed'));
  expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ cancelledSeats: ['B01'] }));
  expect(v.getByTestId('screen.cancellation.refunding')).toBeTruthy();
  fireEvent.press(v.getByTestId('cancel.providerConfirmed'));
  expect(v.getByTestId('screen.cancellation.refunded')).toBeTruthy();
  expect(update).toHaveBeenLastCalledWith(
    expect.objectContaining({ cancelledSeats: ['B01'], refundedSeats: ['B01'] }),
  );
});

test('opening a pending refund resumes provider wait with original amount', () => {
  const v = render(
    <CancellationFlow
      booking={{
        ...booking,
        cancelledSeats: ['B01'],
        refundRequest: { seats: ['B01'], stage: 'refunding' },
      }}
      onClose={jest.fn()}
      onUpdate={jest.fn()}
    />,
  );
  expect(v.getByTestId('screen.cancellation.refunding')).toBeTruthy();
  expect(v.getByText('342.000đ')).toBeTruthy();
  expect(v.queryByTestId('cancel.confirm')).toBeNull();
});
