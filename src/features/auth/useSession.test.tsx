import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { SessionProvider } from './sessionContext';
import { useSession } from './useSession';
import { AppProviders } from '../../app/providers/AppProviders';
import { createTestWorld } from '../../testing/createTestWorld';
import { createInMemoryMockAuthStorage } from '../../repositories/mock/mockAuthStorage';
import {
  setSecureSessionStorageAdapter,
  saveSession,
  SECURE_SESSION_KEY,
} from '../../shared/native/secureSessionStorage';
import type { Session, Result } from '../../domain/types';

describe('features/auth/useSession', () => {
  const store = new Map<string, string>();
  const testAdapter = {
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
    setSecureSessionStorageAdapter(testAdapter);
  });

  afterAll(() => {
    setSecureSessionStorageAdapter(null);
  });

  it('provides initial null session when not authenticated', async () => {
    const world = createTestWorld();
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.session).toBeNull();
  });

  it('updates session and persists upon successful login', async () => {
    const world = createTestWorld();
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      const loginRes = await result.current.login('0912345678', 'customer-password-123');
      expect(loginRes.ok).toBe(true);
    });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.role).toBe('customer');
  });

  it('clears session and storage on logout even if remote repository.logout fails', async () => {
    const world = createTestWorld();
    const failingRepo = {
      ...world.repository,
      async logout(): Promise<void> {
        throw new Error('Network failure during logout');
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={failingRepo}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await result.current.login('0912345678', 'customer-password-123');
    });
    expect(result.current.session).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    // Local state and SecureStore must be cleared regardless of remote network failure
    expect(result.current.session).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);
  });

  it('triggers onLogoutCleanup to cancel pending queries and clear caches on logout', async () => {
    const world = createTestWorld();
    const cleanupSpy = jest.fn();

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository} onLogoutCleanup={cleanupSpy}>
        {children}
      </SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await result.current.login('0912345678', 'customer-password-123');
      await result.current.logout();
    });

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it('prevents late login resolution from reviving session after logout (race condition)', async () => {
    const world = createTestWorld();
    let resolveLoginPromise!: (res: Result<Session>) => void;
    const delayedLoginPromise = new Promise<Result<Session>>((resolve) => {
      resolveLoginPromise = resolve;
    });

    const slowRepo = {
      ...world.repository,
      async login(): Promise<Result<Session>> {
        return delayedLoginPromise;
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={slowRepo}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    let loginCallPromise: Promise<Result<Session>>;
    act(() => {
      loginCallPromise = result.current.login('0912345678', 'customer-password-123');
    });

    // While login is in flight, user triggers logout
    await act(async () => {
      await result.current.logout();
    });

    // Now delayed login completes
    await act(async () => {
      resolveLoginPromise({
        ok: true,
        value: world.sessions.customer,
      });
      await loginCallPromise;
    });

    // Session MUST NOT be revived by the late login
    expect(result.current.session).toBeNull();
  });

  it('rejects double-submit when a login operation is already in progress', async () => {
    const world = createTestWorld();
    let resolveLogin!: (res: Result<Session>) => void;
    const delayedPromise = new Promise<Result<Session>>((resolve) => {
      resolveLogin = resolve;
    });

    const slowRepo = {
      ...world.repository,
      async login(): Promise<Result<Session>> {
        return delayedPromise;
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={slowRepo}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    let firstLogin!: Promise<Result<Session>>;
    let secondLogin!: Promise<Result<Session>>;

    act(() => {
      firstLogin = result.current.login('0912345678', 'customer-password-123');
    });

    act(() => {
      secondLogin = result.current.login('0912345678', 'customer-password-123');
    });

    const secondRes = await secondLogin;
    expect(secondRes.ok).toBe(false);
    if (!secondRes.ok) {
      expect(secondRes.code).toBe('conflict');
    }

    await act(async () => {
      resolveLogin({ ok: true, value: world.sessions.customer });
      await firstLogin;
    });
  });

  it('validates cold restored session against repository authority before mounting as authenticated', async () => {
    const world = createTestWorld();
    const forgedSession: Session = {
      accountId: 'FORGED-ACCOUNT',
      sessionId: 'FORGED-SESSION',
      role: 'customer',
      accessToken: 'forged-token',
      expiresAt: world.clock.now() + 3600000,
    };
    await saveSession(forgedSession);

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository} autoRestore={true}>
        {children}
      </SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    // Wait for autoRestore verification cycle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Forged session not in repository authority must be cleared and rejected
    expect(result.current.session).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);
  });

  it('restores valid session across recreated repository authority (cold restore)', async () => {
    const sharedAuthStorage = createInMemoryMockAuthStorage();
    const world1 = createTestWorld({ authStorage: sharedAuthStorage });
    const loginRes = await world1.repository.login({
      identifier: '0912345678',
      password: 'customer-password-123',
    });
    expect(loginRes.ok).toBe(true);
    if (!loginRes.ok) return;

    await saveSession(loginRes.value);

    // Recreate repository and world with same backing authStorage
    const world2 = createTestWorld({ authStorage: sharedAuthStorage });

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world2.repository} autoRestore={true}>
        {children}
      </SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.accountId).toBe('CUSTOMER-1');
    expect(result.current.session?.sessionId).toBe(loginRes.value.sessionId);
  });

  it('rejects malformed, unsupported role, or expired login/register responses without persisting', async () => {
    const world = createTestWorld();

    // 1. Repo returns unsupported role
    const repoWithBadRole = {
      ...world.repository,
      async login(): Promise<Result<Session>> {
        return {
          ok: true,
          value: {
            accountId: 'ACC-ADMIN',
            sessionId: 'SESS-ADMIN',
            role: 'superadmin' as unknown as import('../../domain/types').Role,
            accessToken: 'tok-admin',
            expiresAt: world.clock.now() + 100000,
          },
        };
      },
    };

    const wrapperBadRole = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={repoWithBadRole} autoRestore={false}>
        {children}
      </SessionProvider>
    );

    const { result: resBadRole } = renderHook(() => useSession(), { wrapper: wrapperBadRole });

    await act(async () => {
      const loginRes = await resBadRole.current.login('admin', 'pass');
      expect(loginRes.ok).toBe(false);
      if (!loginRes.ok) {
        expect(loginRes.code).toBe('validation');
      }
    });
    expect(resBadRole.current.session).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);

    // 2. Repo returns already-expired session
    const repoWithExpired = {
      ...world.repository,
      async login(): Promise<Result<Session>> {
        return {
          ok: true,
          value: {
            ...world.sessions.customer,
            expiresAt: world.clock.now() - 100,
          },
        };
      },
    };

    const wrapperExpired = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={repoWithExpired} autoRestore={false} now={world.clock.now}>
        {children}
      </SessionProvider>
    );

    const { result: resExpired } = renderHook(() => useSession(), { wrapper: wrapperExpired });

    await act(async () => {
      const loginRes = await resExpired.current.login('0912345678', 'customer-password-123');
      expect(loginRes.ok).toBe(false);
      if (!loginRes.ok) {
        expect(loginRes.code).toBe('unauthorized');
      }
    });
    expect(resExpired.current.session).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);
  });

  it('clears session immediately upon logout while remote work is still in flight', async () => {
    const world = createTestWorld();
    let resolveRemoteLogout!: () => void;
    const remoteLogoutPromise = new Promise<void>((resolve) => {
      resolveRemoteLogout = resolve;
    });

    const slowLogoutRepo = {
      ...world.repository,
      async logout(): Promise<void> {
        return remoteLogoutPromise;
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={slowLogoutRepo}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await result.current.login('0912345678', 'customer-password-123');
    });
    expect(result.current.session).not.toBeNull();

    let logoutCall!: Promise<void>;
    act(() => {
      logoutCall = result.current.logout();
    });

    // Session must be cleared locally immediately, without waiting for remote logout
    expect(result.current.session).toBeNull();

    await act(async () => {
      resolveRemoteLogout();
      await logoutCall;
    });
    expect(result.current.session).toBeNull();
  });

  it('guarantees session is set to null even if clearStoredSession rejects', async () => {
    const world = createTestWorld();
    const failingStoreAdapter = {
      ...testAdapter,
      async removeItem(): Promise<void> {
        throw new Error('Disk write error removing session');
      },
    };
    setSecureSessionStorageAdapter(failingStoreAdapter);

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await result.current.login('0912345678', 'customer-password-123');
    });
    expect(result.current.session).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.session).toBeNull();
  });

  it('prevents deferred save from resurrecting stored session after logout', async () => {
    const world = createTestWorld();
    let resolveSlowSave!: () => void;
    const slowSavePromise = new Promise<void>((resolve) => {
      resolveSlowSave = resolve;
    });

    let interceptSave = false;
    const slowStorageAdapter = {
      ...testAdapter,
      async setItem(key: string, value: string): Promise<void> {
        if (interceptSave) {
          await slowSavePromise;
        }
        await testAdapter.setItem(key, value);
      },
    };
    setSecureSessionStorageAdapter(slowStorageAdapter);

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    interceptSave = true;
    let loginCall!: Promise<Result<Session>>;
    act(() => {
      loginCall = result.current.login('0912345678', 'customer-password-123');
    });

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.session).toBeNull();

    await act(async () => {
      resolveSlowSave();
      await loginCall;
    });

    expect(result.current.session).toBeNull();
    expect(store.has(SECURE_SESSION_KEY)).toBe(false);
  });

  it('ensures stale restore never overwrites or clears a newer successful login', async () => {
    const world = createTestWorld();
    let resolveSlowRead!: (val: string | null) => void;
    const slowReadPromise = new Promise<string | null>((resolve) => {
      resolveSlowRead = resolve;
    });

    let interceptRead = true;
    const slowStorageAdapter = {
      ...testAdapter,
      async getItem(key: string): Promise<string | null> {
        if (interceptRead) {
          return slowReadPromise;
        }
        return testAdapter.getItem(key);
      },
    };
    setSecureSessionStorageAdapter(slowStorageAdapter);

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <SessionProvider repository={world.repository} autoRestore={true}>
        {children}
      </SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    interceptRead = false;
    await act(async () => {
      const loginRes = await result.current.login('0912345678', 'customer-password-123');
      expect(loginRes.ok).toBe(true);
    });

    expect(result.current.session).not.toBeNull();
    const activeSessionId = result.current.session?.sessionId;

    await act(async () => {
      resolveSlowRead(null);
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.sessionId).toBe(activeSessionId);
  });

  it('wires onLogoutCleanup in AppProviders to cancel queries and clear query cache', async () => {
    const world = createTestWorld();
    const queryClient = new QueryClient();
    const cancelSpy = jest.spyOn(queryClient, 'cancelQueries');
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <AppProviders
        repository={world.repository}
        now={world.clock.now}
        initialInitialized={true}
        queryClient={queryClient}
      >
        {children}
      </AppProviders>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await result.current.login('0912345678', 'customer-password-123');
      await result.current.logout();
    });

    expect(cancelSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });
});
