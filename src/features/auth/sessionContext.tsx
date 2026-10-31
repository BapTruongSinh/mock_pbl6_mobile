import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Result, Session } from '../../domain/types';
import type { TravelRepository } from '../../repositories/contracts/TravelRepository';
import {
  clearSession as clearStoredSession,
  readSession as readStoredSession,
  saveSession as saveStoredSession,
  validateSessionShape,
} from '../../shared/native/secureSessionStorage';

export interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  login(identifier: string, password: string): Promise<Result<Session>>;
  register(input: {
    fullName: string;
    phone?: string;
    email?: string;
    password: string;
  }): Promise<Result<Session>>;
  logout(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: React.ReactNode;
  repository?: TravelRepository;
  initialSession?: Session | null;
  autoRestore?: boolean;
  now?: () => number;
  onLogoutCleanup?: () => Promise<void> | void;
}

export function SessionProvider({
  children,
  repository,
  initialSession = null,
  autoRestore = false,
  now: injectedNow,
  onLogoutCleanup,
}: SessionProviderProps): React.ReactElement {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isBusyRef = useRef<boolean>(false);
  const opCounterRef = useRef<number>(0);
  const nowFn = useMemo(() => injectedNow, [injectedNow]);

  // Restore stored session on mount when autoRestore is explicitly enabled
  useEffect(() => {
    if (!autoRestore) {
      return undefined;
    }
    const opId = ++opCounterRef.current;
    let active = true;

    async function restore(): Promise<void> {
      try {
        const stored = await readStoredSession(nowFn ? nowFn() : undefined);
        if (!active || opId !== opCounterRef.current) {
          return;
        }
        if (!stored) {
          if (active && opId === opCounterRef.current) {
            setSession(null);
          }
          return;
        }

        // Validate cold restored session against repository authority
        if (repository) {
          let verifyRes: Result<Session>;
          try {
            verifyRes = await repository.validateSession(stored);
          } catch {
            verifyRes = {
              ok: false,
              code: 'unknown',
              message: 'Session authority verification failed',
            };
          }

          if (!active || opId !== opCounterRef.current) {
            return;
          }

          if (!verifyRes.ok) {
            await clearStoredSession();
            if (active && opId === opCounterRef.current) {
              setSession(null);
            }
            return;
          }

          if (active && opId === opCounterRef.current) {
            setSession(verifyRes.value);
          }
          return;
        }

        if (active && opId === opCounterRef.current) {
          setSession(stored);
        }
      } catch {
        if (active && opId === opCounterRef.current) {
          await clearStoredSession().catch(() => {});
          setSession(null);
        }
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, [autoRestore, repository, nowFn]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<Result<Session>> => {
      if (!repository) {
        return {
          ok: false,
          code: 'network',
          message: 'Repository chưa sẵn sàng',
        };
      }
      if (isBusyRef.current) {
        return {
          ok: false,
          code: 'conflict',
          message: 'Yêu cầu đang được xử lý',
        };
      }

      isBusyRef.current = true;
      setIsLoading(true);
      const opId = ++opCounterRef.current;

      try {
        const res = await repository.login({ identifier, password });
        if (opId !== opCounterRef.current) {
          return res;
        }

        if (res.ok) {
          // Runtime validation of repository response before persisting or setting state
          const validated = validateSessionShape(res.value, nowFn ? nowFn() : undefined);
          if (!validated.ok) {
            return validated;
          }

          await saveStoredSession(validated.value);
          if (opId !== opCounterRef.current) {
            // Superseded while saving (e.g. by logout)
            await clearStoredSession().catch(() => {});
            return res;
          }

          setSession(validated.value);
        }
        return res;
      } finally {
        isBusyRef.current = false;
        setIsLoading(false);
      }
    },
    [repository, nowFn],
  );

  const register = useCallback(
    async (input: {
      fullName: string;
      phone?: string;
      email?: string;
      password: string;
    }): Promise<Result<Session>> => {
      if (!repository) {
        return {
          ok: false,
          code: 'network',
          message: 'Repository chưa sẵn sàng',
        };
      }
      if (isBusyRef.current) {
        return {
          ok: false,
          code: 'conflict',
          message: 'Yêu cầu đang được xử lý',
        };
      }

      isBusyRef.current = true;
      setIsLoading(true);
      const opId = ++opCounterRef.current;

      try {
        const res = await repository.register(input);
        if (opId !== opCounterRef.current) {
          return res;
        }

        if (res.ok) {
          // Runtime validation of repository response before persisting or setting state
          const validated = validateSessionShape(res.value, nowFn ? nowFn() : undefined);
          if (!validated.ok) {
            return validated;
          }

          await saveStoredSession(validated.value);
          if (opId !== opCounterRef.current) {
            await clearStoredSession().catch(() => {});
            return res;
          }

          setSession(validated.value);
        }
        return res;
      } finally {
        isBusyRef.current = false;
        setIsLoading(false);
      }
    },
    [repository, nowFn],
  );

  const logout = useCallback(async (): Promise<void> => {
    opCounterRef.current += 1;
    setIsLoading(true);
    const sessionToRevoke = session;
    // Clear local session state immediately so UI does not wait on remote work
    setSession(null);

    try {
      try {
        await onLogoutCleanup?.();
      } catch {
        // Safe suppression of cleanup error
      }
      if (repository && sessionToRevoke) {
        try {
          await repository.logout(sessionToRevoke);
        } catch {
          // Safe suppression of remote network failure
        }
      }
    } finally {
      try {
        await clearStoredSession();
      } catch {
        // Safe suppression of storage error
      } finally {
        setSession(null);
        setIsLoading(false);
      }
    }
  }, [repository, session, onLogoutCleanup]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      login,
      register,
      logout,
    }),
    [session, isLoading, login, register, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionContext must be used within <SessionProvider>');
  }
  return ctx;
}
