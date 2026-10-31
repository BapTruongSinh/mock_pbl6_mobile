import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DriverTripActionSheet } from './DriverTripActionSheet';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
test('confirmation and cancellation are separate; pending/locked cannot confirm', () => {
  const onConfirm = jest.fn(),
    onClose = jest.fn();
  const props = {
    stage: 'scheduled' as const,
    driverName: 'Hoàng Nam',
    onConfirm,
    onClose,
    onReload: jest.fn(),
    onHome: jest.fn(),
    onLogin: jest.fn(),
  };
  const ui = render(<DriverTripActionSheet {...props} mode="confirm" />);
  fireEvent.press(ui.getByTestId('driver.action.cancel'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.press(ui.getByTestId('driver.action.confirm'));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  ui.rerender(<DriverTripActionSheet {...props} mode="pending" />);
  fireEvent.press(ui.getByTestId('driver.action.confirm'));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(ui.queryByTestId('driver.action.cancel')).toBeNull();
  ui.rerender(<DriverTripActionSheet {...props} mode="confirm" enabled={false} />);
  fireEvent.press(ui.getByTestId('driver.action.confirm'));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
test('uncertain and stale results reload instead of resubmitting a transition', () => {
  const onConfirm = jest.fn(),
    onReload = jest.fn();
  const ui = render(
    <DriverTripActionSheet
      mode="uncertain"
      stage="boarding"
      driverName="Hoàng Nam"
      onConfirm={onConfirm}
      onReload={onReload}
      onClose={() => undefined}
      onHome={() => undefined}
      onLogin={() => undefined}
    />,
  );
  fireEvent.press(ui.getByTestId('driver.action.confirm'));
  expect(onReload).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});
