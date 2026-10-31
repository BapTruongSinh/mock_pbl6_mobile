import { act, renderHook } from '@testing-library/react-native';
import { useGuestQrScanner } from './useGuestQrScanner';
test('valid QR fills code automatically, duplicate frames do not overwrite it', () => {
  const { result } = renderHook(useGuestQrScanner);
  act(() => result.current.onBarcode('TVL-9K2C-7M4Q'));
  expect(result.current.ticketCode).toBe('TVL-9K2C-7M4Q');
  act(() => result.current.onBarcode('OTHER-123'));
  expect(result.current.ticketCode).toBe('TVL-9K2C-7M4Q');
});
test('ticket JSON extracts code, unsafe URL is not accepted or executed', () => {
  const { result } = renderHook(useGuestQrScanner);
  act(() => result.current.onBarcode('https://example.com'));
  expect(result.current.ticketCode).toBe('');
  expect(result.current.error).toBeTruthy();
  act(() =>
    result.current.onBarcode(
      JSON.stringify({ version: 1, ticketCode: 'blue-123', signature: 'mock:example' }),
    ),
  );
  expect(result.current.ticketCode).toBe('BLUE-123');
  act(() => result.current.scanAgain());
  expect(result.current.ticketCode).toBe('');
});
