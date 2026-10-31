import { useState } from 'react';
import { useSession } from './useSession';

export type RegisterValues = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export function useRegisterForm(): {
  values: RegisterValues;
  acceptedTerms: boolean;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  update: (field: keyof RegisterValues, value: string) => void;
  toggleTerms: () => void;
  submit: () => Promise<void>;
} {
  const { register, isLoading } = useSession();
  const [values, setValues] = useState<RegisterValues>({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const update = (field: keyof RegisterValues, value: string): void => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setError(null);
    setSuccess(false);
  };
  const toggleTerms = (): void => {
    setAcceptedTerms((previous) => !previous);
    setError(null);
  };
  const submit = async (): Promise<void> => {
    if (isLoading || success) return;
    if (
      !values.fullName.trim() ||
      !values.phone.trim() ||
      !values.email.trim() ||
      !values.password ||
      !values.confirmPassword
    ) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!/^(0|\+84)[1-9]\d{8}$/.test(values.phone.replace(/[\s.-]/g, ''))) {
      setError('Số điện thoại không hợp lệ');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError('Email không hợp lệ');
      return;
    }
    if (values.password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự');
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!acceptedTerms) {
      setError('Vui lòng đồng ý Điều khoản và Chính sách bảo mật');
      return;
    }
    setError(null);
    try {
      const result = await register({
        fullName: values.fullName.trim(),
        phone: values.phone.replace(/[\s.-]/g, ''),
        email: values.email.trim(),
        password: values.password,
      });
      if (!result.ok) {
        setError(result.message || 'Không thể tạo tài khoản. Vui lòng thử lại');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Không thể tạo tài khoản. Vui lòng thử lại');
    }
  };
  return { values, acceptedTerms, isLoading, error, success, update, toggleTerms, submit };
}
