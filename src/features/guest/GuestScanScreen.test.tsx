/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { AppState } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GuestScanScreen } from './GuestScanScreen';
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
  CameraView: require('react-native').View,
}));
test('camera QR callback fills readonly code; manual return calls navigation', () => {
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  const back = jest.fn();
  const view = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      <GuestScanScreen onBack={back} />
    </SafeAreaProvider>,
  );
  expect(view.getByTestId('guest.scan.ticketCode').props.editable).toBe(false);
  expect(view.getByTestId('guest.scan.check').props.accessibilityState.disabled).toBe(true);
  fireEvent(view.getByTestId('guest.scan.camera'), 'barcodeScanned', { data: 'TVL-9K2C-7M4Q' });
  expect(view.getByTestId('guest.scan.ticketCode').props.value).toBe('TVL-9K2C-7M4Q');
  expect(view.getByTestId('guest.scan.check').props.accessibilityState.disabled).toBe(false);
  fireEvent.press(view.getByTestId('guest.scan.manual'));
  expect(back).toHaveBeenCalledTimes(1);
});
