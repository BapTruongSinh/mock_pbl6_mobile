import { useRef, useState } from 'react';
import { MAX_QR_PAYLOAD_LENGTH, parseTicketQr } from '../../shared/native/cameraGateway';
export function useGuestQrScanner(): {
  ticketCode: string;
  error: string | null;
  onBarcode: (data: string) => void;
  scanAgain: () => void;
} {
  const [ticketCode, setTicketCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const onBarcode = (data: string): void => {
    if (locked.current) return;
    if (!data || data.length > MAX_QR_PAYLOAD_LENGTH) {
      setError('Mã QR không hợp lệ. Vui lòng thử lại.');
      return;
    }
    const parsed = parseTicketQr(data);
    const code = parsed.ok ? parsed.value.ticketCode : data.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(code)) {
      setError('Đây không phải mã QR vé hợp lệ.');
      return;
    }
    locked.current = true;
    setTicketCode(code);
    setError(null);
  };
  const scanAgain = (): void => {
    locked.current = false;
    setTicketCode('');
    setError(null);
  };
  return { ticketCode, error, onBarcode, scanAgain };
}
