import { act, renderHook } from '@testing-library/react-native';
import { useRegisterForm, type RegisterValues } from './useRegisterForm';
const mockRegister = jest.fn();
jest.mock('./useSession', () => ({
  useSession: () => ({ register: mockRegister, isLoading: false }),
}));
const valid: RegisterValues = {
  fullName: 'Khách thử nghiệm',
  phone: '0901234567',
  email: 'review@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};
function fill(result: { current: ReturnType<typeof useRegisterForm> }, values = valid): void {
  act(() => {
    for (const [key, value] of Object.entries(values))
      result.current.update(key as keyof RegisterValues, value);
  });
}
beforeEach(() => {
  mockRegister.mockReset();
});
test('empty form cannot register', async () => {
  const { result } = renderHook(useRegisterForm);
  await act(async () => result.current.submit());
  expect(result.current.error).toBe('Vui lòng nhập đầy đủ thông tin');
  expect(mockRegister).not.toHaveBeenCalled();
});
test('mismatched password cannot register', async () => {
  const { result } = renderHook(useRegisterForm);
  fill(result, { ...valid, confirmPassword: 'different123' });
  await act(async () => result.current.submit());
  expect(result.current.error).toBe('Mật khẩu xác nhận không khớp');
  expect(mockRegister).not.toHaveBeenCalled();
});
test('requires consent before registration', async () => {
  const { result } = renderHook(useRegisterForm);
  fill(result);
  await act(async () => result.current.submit());
  expect(result.current.error).toContain('đồng ý');
  expect(mockRegister).not.toHaveBeenCalled();
});
test('valid consent submits account without confirmation and prevents repeated success submission', async () => {
  mockRegister.mockResolvedValue({ ok: true, value: {} });
  const { result } = renderHook(useRegisterForm);
  fill(result);
  act(() => result.current.toggleTerms());
  await act(async () => result.current.submit());
  expect(mockRegister).toHaveBeenCalledWith({
    fullName: valid.fullName,
    phone: valid.phone,
    email: valid.email,
    password: valid.password,
  });
  expect(result.current.success).toBe(true);
  await act(async () => result.current.submit());
  expect(mockRegister).toHaveBeenCalledTimes(1);
});
test('repository duplicate rejection remains an error', async () => {
  mockRegister.mockResolvedValue({ ok: false, code: 'conflict', message: 'Tài khoản đã tồn tại' });
  const { result } = renderHook(useRegisterForm);
  fill(result);
  act(() => result.current.toggleTerms());
  await act(async () => result.current.submit());
  expect(result.current.success).toBe(false);
  expect(result.current.error).toBe('Tài khoản đã tồn tại');
});
