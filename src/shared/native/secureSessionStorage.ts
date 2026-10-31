import * as SecureStore from 'expo-secure-store';
import type { Result, Session } from '../../domain/types';

export const SECURE_SESSION_KEY = 'blue_travel_auth_session_v1';

export interface SecureSessionStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let customAdapter: SecureSessionStorageAdapter | null = null;
let writeGeneration = 0;

export function setSecureSessionStorageAdapter(adapter: SecureSessionStorageAdapter | null): void {
  customAdapter = adapter;
  writeGeneration = 0;
}

export function validateSessionShape(value: unknown, now?: number): Result<Session> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      code: 'validation',
      message: 'Session data must be a non-null object',
    };
  }

  const s = value as Partial<Session>;
  if (typeof s.accountId !== 'string' || s.accountId.trim().length === 0) {
    return {
      ok: false,
      code: 'validation',
      message: 'Session missing or invalid accountId',
    };
  }
  if (typeof s.sessionId !== 'string' || s.sessionId.trim().length === 0) {
    return {
      ok: false,
      code: 'validation',
      message: 'Session missing or invalid sessionId',
    };
  }
  if (typeof s.accessToken !== 'string' || s.accessToken.trim().length === 0) {
    return {
      ok: false,
      code: 'validation',
      message: 'Session missing or invalid accessToken',
    };
  }
  if (s.role !== 'customer' && s.role !== 'driver') {
    return {
      ok: false,
      code: 'validation',
      message: 'Session contains unsupported role',
    };
  }
  if (typeof s.expiresAt !== 'number' || !Number.isFinite(s.expiresAt) || s.expiresAt <= 0) {
    return {
      ok: false,
      code: 'validation',
      message: 'Session contains non-finite or non-positive expiresAt',
    };
  }

  if (typeof now === 'number' && Number.isFinite(now) && now >= s.expiresAt) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'Session has expired',
    };
  }

  return { ok: true, value: s as Session };
}

async function getStorage(): Promise<SecureSessionStorageAdapter> {
  if (customAdapter) {
    return customAdapter;
  }
  return {
    async getItem(key: string): Promise<string | null> {
      return SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      await SecureStore.setItemAsync(key, value);
    },
    async removeItem(key: string): Promise<void> {
      await SecureStore.deleteItemAsync(key);
    },
  };
}

export async function saveSession(session: Session): Promise<void> {
  const currentGen = ++writeGeneration;
  const storage = await getStorage();
  const serialized = JSON.stringify(session);
  await storage.setItem(SECURE_SESSION_KEY, serialized);
  if (writeGeneration !== currentGen) {
    // Superseded by clearSession or another save while writing
    try {
      await storage.removeItem(SECURE_SESSION_KEY);
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function readSession(now?: number): Promise<Session | null> {
  const storage = await getStorage();
  const serialized = await storage.getItem(SECURE_SESSION_KEY);
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    const validated = validateSessionShape(parsed, now);
    if (!validated.ok) {
      await clearSession();
      return null;
    }
    return validated.value;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  writeGeneration += 1;
  const storage = await getStorage();
  await storage.removeItem(SECURE_SESSION_KEY);
}
