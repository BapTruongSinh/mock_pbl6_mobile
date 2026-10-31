import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from './WelcomeScreen';
test('welcome renders Figma text and start opens login via callback', () => {
  const start = jest.fn();
  const view = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      <WelcomeScreen onStart={start} />
    </SafeAreaProvider>,
  );
  expect(view.getByText('Mở lối hành trình')).toBeTruthy();
  expect(view.getByText('Đi xa thật dễ.')).toBeTruthy();
  fireEvent.press(view.getByTestId('welcome.start'));
  expect(start).toHaveBeenCalledTimes(1);
});
