import type { Result } from './types';

export function normalizeTicketCode(value: string): string {
  if (!value) {
    return '';
  }
  return value.trim().toUpperCase();
}

export function normalizeVietnamPhone(value: string): Result<string> {
  if (!value || typeof value !== 'string') {
    return {
      ok: false,
      code: 'validation',
      message: 'Số điện thoại không được để trống',
    };
  }

  // Remove common punctuation: space, -, ., (, )
  let sanitized = value.replace(/[\s\-.()]/g, '');

  // Convert +84 prefix to 0
  if (sanitized.startsWith('+84')) {
    sanitized = '0' + sanitized.slice(3);
  }

  // Exactly 10 digits starting with 0
  const vnPhoneRegex = /^0\d{9}$/;
  if (!vnPhoneRegex.test(sanitized)) {
    return {
      ok: false,
      code: 'validation',
      message: 'Số điện thoại Việt Nam không hợp lệ (phải có 10 chữ số bắt đầu bằng 0)',
    };
  }

  return {
    ok: true,
    value: sanitized,
  };
}
