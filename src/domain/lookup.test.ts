import { normalizeTicketCode, normalizeVietnamPhone } from './lookup';

describe('domain/lookup', () => {
  describe('normalizeTicketCode', () => {
    it('handles empty or falsy inputs', () => {
      expect(normalizeTicketCode('')).toBe('');
      expect(normalizeTicketCode('   ')).toBe('');
    });

    it('trims leading and trailing spaces', () => {
      expect(normalizeTicketCode('  TK-123  ')).toBe('TK-123');
    });

    it('converts lowercase characters to uppercase ASCII', () => {
      expect(normalizeTicketCode('tk-sg-dl-01')).toBe('TK-SG-DL-01');
    });
  });

  describe('normalizeVietnamPhone', () => {
    it('rejects empty input', () => {
      const res = normalizeVietnamPhone('');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe('validation');
      }
    });

    it('handles standard 10-digit number starting with 0', () => {
      const res = normalizeVietnamPhone('0912345678');
      expect(res).toEqual({ ok: true, value: '0912345678' });
    });

    it('converts +84 international format to standard 0 prefix', () => {
      const res = normalizeVietnamPhone('+84912345678');
      expect(res).toEqual({ ok: true, value: '0912345678' });
    });

    it('strips dashes, dots, spaces, and parentheses', () => {
      const res = normalizeVietnamPhone('+84 (91) 234-56.78');
      expect(res).toEqual({ ok: true, value: '0912345678' });
    });

    it('rejects numbers that do not have exactly 10 digits after normalization', () => {
      expect(normalizeVietnamPhone('091234567').ok).toBe(false); // 9 digits
      expect(normalizeVietnamPhone('09123456789').ok).toBe(false); // 11 digits
    });

    it('rejects non-Vietnam country codes', () => {
      expect(normalizeVietnamPhone('+14155552671').ok).toBe(false);
      expect(normalizeVietnamPhone('+821012345678').ok).toBe(false);
    });
  });
});
