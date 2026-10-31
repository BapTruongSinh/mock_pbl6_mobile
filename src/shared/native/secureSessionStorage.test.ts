import {
  clearSession,
  readSession,
  saveSession,
  setSecureSessionStorageAdapter,
  SECURE_SESSION_KEY,
} from './secureSessionStorage';
import type { Session } from '../../domain/types';

describe('shared/native/secureSessionStorage', () => {
  const store = new Map<string, string>();
  const memoryAdapter = {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      store.delete(key);
    },
  };

  beforeEach(() => {
    store.clear();
    setSecureSessionStorageAdapter(memoryAdapter);
  });

  afterAll(() => {
    setSecureSessionStorageAdapter(null);
  });

  it('serializes and saves session under canonical key', async () => {
    const session: Session = {
      accountId: 'CUST-001',
      sessionId: 'SESS-001',
      role: 'customer',
      accessToken: 'token-abc',
      expiresAt: 2000000000000,
    };
    await saveSession(session);
    expect(store.has(SECURE_SESSION_KEY)).toBe(true);

    const loaded = await readSession(1000);
    expect(loaded).toEqual(session);
  });

  it('returns null and clears storage when stored session is corrupted', async () => {
    store.set(SECURE_SESSION_KEY, 'not-valid-json');
    const loaded = await readSession();
    expect(loaded).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);
  });

  it('returns null and clears storage when session has expired', async () => {
    const expired: Session = {
      accountId: 'CUST-EXP',
      sessionId: 'SESS-EXP',
      role: 'customer',
      accessToken: 'token-exp',
      expiresAt: 5000,
    };
    await saveSession(expired);

    // Reading with currentTime = 6000
    const loaded = await readSession(6000);
    expect(loaded).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);
  });

  it('clears session upon explicit clearSession call', async () => {
    const session: Session = {
      accountId: 'CUST-002',
      sessionId: 'SESS-002',
      role: 'customer',
      accessToken: 'token-xyz',
      expiresAt: 2000000000000,
    };
    await saveSession(session);
    await clearSession();

    const loaded = await readSession(1000);
    expect(loaded).toBeNull();
  });
});
