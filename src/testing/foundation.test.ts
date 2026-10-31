import { HOLD_DURATION_MS, MAX_SEATS } from '../domain/types';
import { createMockRepository } from '../repositories/mock/createMockRepository';

describe('Foundation contract (Appendix A Recipe 1.3)', () => {
  test('exports canonical domain constants and mock repository kind', () => {
    expect(MAX_SEATS).toBe(6);
    expect(HOLD_DURATION_MS).toBe(600000);
    expect(createMockRepository({ now: () => 0, seed: 'foundation' }).kind).toBe('mock');
  });

  test('initializes deterministic seed state and returns notImplemented for later-plan mutations', async () => {
    const fixedNow = Date.parse('2026-08-27T00:00:00+07:00');
    const repo = createMockRepository({ now: () => fixedNow, seed: 'foundation' });

    const initResult = await repo.initialize();
    expect(initResult).toEqual({ ok: true, value: undefined });

    const tripResult = await repo.getTrip('TR-204');
    expect(tripResult.ok).toBe(true);
    if (tripResult.ok) {
      expect(tripResult.value.id).toBe('TR-204');
    }

    const seatsResult = await repo.getSeats('TR-204');
    expect(seatsResult.ok).toBe(true);
    if (seatsResult.ok) {
      expect(seatsResult.value).toHaveLength(8);
    }

    const paymentResult = await repo.createPayment({
      draftId: 'DRAFT-204',
      session: {
        accountId: 'CUSTOMER-1',
        sessionId: 'SES-CUST-1',
        role: 'customer',
        accessToken: 'tok-cust-1',
        expiresAt: fixedNow + 3600000,
      },
      idempotencyKey: 'idem-1',
    });
    expect(paymentResult).toEqual({
      ok: false,
      code: 'notImplemented',
      message: expect.stringContaining('createPayment'),
    });
  });
});
