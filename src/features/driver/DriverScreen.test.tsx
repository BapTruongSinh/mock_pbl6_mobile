import React from 'react';
import { render, within } from '@testing-library/react-native';
import { DriverScreen } from './DriverScreen';
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
let mockState = 'loading';
jest.mock('./useDriverSchedule', () => ({
  useDriverSchedule: () => ({
    session: { role: 'driver' },
    state: mockState,
    tab: 'today',
    trips: [],
    selected: null,
    refresh: jest.fn(),
    simulate: jest.fn(),
    clearSelection: jest.fn(),
    changeTab: jest.fn(),
  }),
}));
test.each(['loading', 'error', 'empty', 'ready'])(
  'Home keeps its header and active tab during %s',
  (state) => {
    mockState = state;
    const tree = render(<DriverScreen onLogout={jest.fn()} />);
    expect(within(tree.getByTestId('driver.title')).getByText('Chuyến của tôi')).toBeTruthy();
    expect(tree.getByTestId('driver.tab.home').props.accessibilityState.selected).toBe(true);
    expect(tree.getByTestId('driver.tab.route').props.accessibilityState.selected).toBe(false);
    expect(tree.queryByTestId('driver.back')).toBeNull();
  },
);
test('Route keeps its own header and selected tab while loading', () => {
  mockState = 'loading';
  const tree = render(<DriverScreen review={{ state: 'loading' }} onLogout={jest.fn()} />);
  expect(within(tree.getByTestId('driver.title')).getByText('Lộ trình')).toBeTruthy();
  expect(tree.getByTestId('driver.tab.route').props.accessibilityState.selected).toBe(true);
});
