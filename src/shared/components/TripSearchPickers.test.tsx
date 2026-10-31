import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TripSearchPickers,
  PROVINCES,
  DEFAULT_SELECTION,
  normalizePlace,
  localDate,
} from './TripSearchPickers';
test('34 distinct current provinces; accentless search and selection preserve other fields', () => {
  expect(PROVINCES).toHaveLength(34);
  expect(new Set(PROVINCES).size).toBe(34);
  expect(normalizePlace('Đà Nẵng')).toBe('da nang');
  const onSelect = jest.fn(),
    onClose = jest.fn();
  const ui = render(
    <TripSearchPickers
      field="origin"
      value={DEFAULT_SELECTION}
      onSelect={onSelect}
      onClose={onClose}
    />,
  );
  fireEvent.changeText(ui.getByTestId('tripPicker.search'), 'da nang');
  fireEvent.press(ui.getByText('Đà Nẵng'));
  expect(onSelect).toHaveBeenCalledWith({ ...DEFAULT_SELECTION, origin: 'Đà Nẵng' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
test('calendar chooses a local date without changing endpoints; close does not select', () => {
  const onSelect = jest.fn(),
    onClose = jest.fn();
  const date = localDate();
  const ui = render(
    <TripSearchPickers
      field="date"
      value={{ ...DEFAULT_SELECTION, departureDate: date }}
      onSelect={onSelect}
      onClose={onClose}
    />,
  );
  fireEvent.press(ui.getByTestId('tripPicker.day.' + date));
  expect(onSelect).toHaveBeenCalledWith({ ...DEFAULT_SELECTION, departureDate: date });
  fireEvent.press(ui.getByTestId('tripPicker.close'));
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test('Vietnamese composed text remains intact in the input, only matching is accent-insensitive', () => {
  const ui = render(
    <TripSearchPickers
      field="origin"
      value={DEFAULT_SELECTION}
      onSelect={() => undefined}
      onClose={() => undefined}
    />,
  );
  for (const text of ['đ', 'Đ', 'Đồng', 'Đồng Nai', 'Đắk Lắk', 'dd', 'address@example.com']) {
    fireEvent.changeText(ui.getByTestId('tripPicker.search'), text);
    expect(ui.getByTestId('tripPicker.search').props.value).toBe(text);
  }
});
