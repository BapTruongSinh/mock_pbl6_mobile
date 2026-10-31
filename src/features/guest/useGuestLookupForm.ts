import { useState } from 'react';
export function useGuestLookupForm(): {
  ticketCode: string;
  bookingPhone: string;
  message: string | null;
  hasError: boolean;
  setTicketCode: (value: string) => void;
  setBookingPhone: (value: string) => void;
  submit: () => void;
} {
  const [ticketCode, updateCode] = useState('');
  const [bookingPhone, updatePhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const clear = (): void => {
    setMessage(null);
    setHasError(false);
  };
  const submit = (): void => {
    if (!ticketCode.trim() || !bookingPhone.trim()) {
      setHasError(true);
      setMessage('Vui lòng nhập mã vé và số điện thoại đặt vé');
      return;
    }
    setHasError(false);
    setMessage('Bạn đã nhập đủ thông tin. Kết quả tra cứu sẽ được bổ sung ở bước tiếp theo.');
  };
  return {
    ticketCode,
    bookingPhone,
    message,
    hasError,
    setTicketCode: (value) => {
      updateCode(value);
      clear();
    },
    setBookingPhone: (value) => {
      updatePhone(value);
      clear();
    },
    submit,
  };
}
