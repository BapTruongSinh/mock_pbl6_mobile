import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchFilterSheet } from './SearchFilterSheet';
import { INITIAL_FILTERS } from './searchModel';
jest.mock('./searchAssets', () => ({ SearchIcon: () => null, searchAssets: {} }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
test('draft selection does not apply until requested; reset restores all fixtures', () => {
  const apply = jest.fn();
  const close = jest.fn();
  const v = render(<SearchFilterSheet initial={INITIAL_FILTERS} onApply={apply} onClose={close} />);
  fireEvent.press(v.getByTestId('search.filter.row.operator'));
  fireEvent.press(v.getByText('BLUE Express'));
  expect(apply).not.toHaveBeenCalled();
  expect(v.getByText('Áp dụng · 3 chuyến')).toBeTruthy();
  fireEvent.press(v.getByTestId('search.filter.apply'));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ operator: 'BLUE Express' }));
  fireEvent.press(v.getByTestId('search.filter.reset'));
  expect(v.getByText('Áp dụng · 12 chuyến')).toBeTruthy();
});
test('close discards draft and invalid time disables apply', () => {
  const apply = jest.fn();
  const close = jest.fn();
  const v = render(
    <SearchFilterSheet
      initial={INITIAL_FILTERS}
      onApply={apply}
      onClose={close}
      initialSection="time"
    />,
  );
  fireEvent.changeText(v.getByTestId('search.filter.time'), '99:99');
  fireEvent.press(v.getByTestId('search.filter.apply'));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.press(v.getByLabelText('Quay lại bộ lọc'));
  fireEvent.press(v.getByRole('button', { name: 'Đóng bộ lọc' }));
  expect(close).toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
});
