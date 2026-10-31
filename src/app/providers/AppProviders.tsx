import { clearDemoTickets } from '../../features/booking/demoTicketRepository';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Font from 'expo-font';
import * as ExpoLegacyFileSystem from 'expo-file-system/legacy';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PendingIntentStorage } from '../../domain/types';
import type { TravelRepository } from '../../repositories/contracts/TravelRepository';
import { createMockRepository } from '../../repositories/mock/createMockRepository';
import {
  createExpoFileSystemAdapter,
  createExpoFileSystemMockStateStorage,
} from '../../repositories/mock/mockStateStorage';
import {
  createExpoFileSystemMockAuthStorage,
  type MockAuthStorage,
} from '../../repositories/mock/mockAuthStorage';
import { createExpoPendingIntentStorage } from '../../shared/native/pendingIntentStorage';
import { typography } from '../../shared/theme/tokens';
import { SessionProvider } from '../../features/auth/sessionContext';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FONT_REGULAR = require('../../shared/assets/fonts/BeVietnamPro-Regular.ttf') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FONT_MEDIUM = require('../../shared/assets/fonts/BeVietnamPro-Medium.ttf') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FONT_SEMIBOLD = require('../../shared/assets/fonts/BeVietnamPro-SemiBold.ttf') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FONT_BOLD = require('../../shared/assets/fonts/BeVietnamPro-Bold.ttf') as number;

async function loadOfficialFonts(): Promise<void> {
  try {
    if (typeof Font.loadAsync === 'function') {
      await Font.loadAsync({
        [typography.fontFamily.regular]: FONT_REGULAR,
        [typography.fontFamily.medium]: FONT_MEDIUM,
        [typography.fontFamily.semiBold]: FONT_SEMIBOLD,
        [typography.fontFamily.bold]: FONT_BOLD,
      });
    }
  } catch {
    // Allow non-native test environments without native font bridge to proceed
  }
}

async function recordNativeColdLaunchProof(nowMs: number): Promise<void> {
  if (
    typeof ExpoLegacyFileSystem.documentDirectory !== 'string' ||
    ExpoLegacyFileSystem.documentDirectory.trim().length === 0
  ) {
    return;
  }
  const dir = ExpoLegacyFileSystem.documentDirectory.endsWith('/')
    ? ExpoLegacyFileSystem.documentDirectory
    : `${ExpoLegacyFileSystem.documentDirectory}/`;
  const fsAdapter = createExpoFileSystemAdapter();
  const proofPath = `${dir}foundation-storage-proof.json`;
  const tempPath = `${proofPath}.tmp`;
  const snapshotPath = `${dir}mock-state-snapshot.v1.json`;

  let previousCount = 0;
  let firstLaunchAt = nowMs;
  const rawPrev = await fsAdapter.readFile(proofPath);
  if (rawPrev !== null) {
    try {
      const parsed = JSON.parse(rawPrev) as { coldLaunchCount?: number; firstLaunchAt?: number };
      if (typeof parsed.coldLaunchCount === 'number' && Number.isFinite(parsed.coldLaunchCount)) {
        previousCount = parsed.coldLaunchCount;
      }
      if (typeof parsed.firstLaunchAt === 'number' && Number.isFinite(parsed.firstLaunchAt)) {
        firstLaunchAt = parsed.firstLaunchAt;
      }
    } catch {
      previousCount = 0;
    }
  }

  const snapshotRaw = await fsAdapter.readFile(snapshotPath);
  const payload = JSON.stringify(
    {
      coldLaunchCount: previousCount + 1,
      firstLaunchAt,
      lastLaunchAt: nowMs,
      documentDirectory: dir,
      snapshotPersisted: snapshotRaw !== null && snapshotRaw.length > 0,
      snapshotBytes: snapshotRaw ? snapshotRaw.length : 0,
    },
    null,
    2,
  );
  await fsAdapter.writeFile(tempPath, payload);
  await fsAdapter.moveFile(tempPath, proofPath);
}

export interface AppDependenciesContextValue {
  repository: TravelRepository;
  pendingIntentStorage: PendingIntentStorage;
  now: () => number;
  initialized: boolean;
  initError: string | null;
}

const AppDependenciesContext = createContext<AppDependenciesContextValue | null>(null);

export interface AppProvidersProps {
  children: React.ReactNode;
  repository?: TravelRepository;
  pendingIntentStorage?: PendingIntentStorage;
  authStorage?: MockAuthStorage;
  now?: () => number;
  initialInitialized?: boolean;
  queryClient?: QueryClient;
  onLogoutCleanup?: () => Promise<void> | void;
}

type InitState =
  | { status: 'loading'; errorMessage: null }
  | { status: 'ready'; errorMessage: null }
  | { status: 'error'; errorMessage: string };

export function AppProviders({
  children,
  repository: injectedRepository,
  pendingIntentStorage: injectedPendingIntentStorage,
  authStorage: injectedAuthStorage,
  now: injectedNow,
  initialInitialized = false,
  queryClient: injectedQueryClient,
  onLogoutCleanup: injectedOnLogoutCleanup,
}: AppProvidersProps): React.ReactElement {
  const nowFn = useMemo(() => injectedNow ?? (() => Date.now()), [injectedNow]);
  const queryClient = useMemo(
    () =>
      injectedQueryClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
    [injectedQueryClient],
  );

  const handleLogoutCleanup = useCallback(async () => {
    queryClient.cancelQueries();
    queryClient.clear();
    clearDemoTickets();
    if (injectedOnLogoutCleanup) {
      await injectedOnLogoutCleanup();
    }
  }, [queryClient, injectedOnLogoutCleanup]);

  const repository = useMemo(
    () =>
      injectedRepository ??
      createMockRepository({
        now: nowFn,
        seed: 'app-runtime',
        storage: createExpoFileSystemMockStateStorage(),
        authStorage: injectedAuthStorage ?? createExpoFileSystemMockAuthStorage(),
      }),
    [injectedRepository, nowFn, injectedAuthStorage],
  );
  const pendingIntentStorage = useMemo(
    () => injectedPendingIntentStorage ?? createExpoPendingIntentStorage(),
    [injectedPendingIntentStorage],
  );

  const [initState, setInitState] = useState<InitState>(
    initialInitialized
      ? { status: 'ready', errorMessage: null }
      : { status: 'loading', errorMessage: null },
  );

  const runInit = useCallback(
    (isMounted: () => boolean) => {
      setInitState({ status: 'loading', errorMessage: null });
      void repository
        .initialize()
        .then(async (result) => {
          if (result.ok) {
            await loadOfficialFonts();
            if (!injectedRepository) {
              await recordNativeColdLaunchProof(nowFn());
            }
          }
          if (!isMounted()) {
            return;
          }
          if (result.ok) {
            setInitState({ status: 'ready', errorMessage: null });
          } else {
            setInitState({ status: 'error', errorMessage: result.message });
          }
        })
        .catch((error: unknown) => {
          if (!isMounted()) {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          setInitState({
            status: 'error',
            errorMessage: message.includes('demo-state-reset')
              ? message
              : `demo-state-reset: ${message}`,
          });
        });
    },
    [injectedRepository, nowFn, repository],
  );

  useEffect(() => {
    if (initialInitialized) {
      return undefined;
    }
    let mounted = true;
    runInit(() => mounted);
    return () => {
      mounted = false;
    };
  }, [initialInitialized, runInit]);

  const initialized = initState.status === 'ready';

  const contextValue = useMemo<AppDependenciesContextValue>(
    () => ({
      repository,
      pendingIntentStorage,
      now: nowFn,
      initialized,
      initError: initState.errorMessage,
    }),
    [repository, pendingIntentStorage, nowFn, initialized, initState.errorMessage],
  );

  return (
    <AppDependenciesContext.Provider value={contextValue}>
      {initState.status === 'loading' ? (
        <View
          style={styles.boundaryContainer}
          testID="app.init.loading"
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang khởi tạo dữ liệu"
        >
          <Text style={styles.boundaryText}>Đang khởi tạo dữ liệu...</Text>
        </View>
      ) : initState.status === 'error' ? (
        <View
          style={styles.boundaryContainer}
          testID="app.init.error"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="Lỗi khởi tạo dữ liệu"
        >
          <Text style={styles.boundaryErrorText} testID="app.init.error.message">
            {initState.errorMessage}
          </Text>
          <Pressable
            style={styles.retryButton}
            testID="app.init.retry"
            accessibilityRole="button"
            accessibilityLabel="Thử lại"
            onPress={() => runInit(() => true)}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <QueryClientProvider client={queryClient}>
          <SessionProvider
            repository={repository}
            autoRestore={!injectedRepository}
            now={nowFn}
            onLogoutCleanup={handleLogoutCleanup}
          >
            {children}
          </SessionProvider>
        </QueryClientProvider>
      )}
    </AppDependenciesContext.Provider>
  );
}

const styles = StyleSheet.create({
  boundaryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  boundaryText: {
    fontSize: 16,
  },
  boundaryErrorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 120,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 15,
  },
});

export function useAppDependencies(): AppDependenciesContextValue {
  const ctx = useContext(AppDependenciesContext);
  if (!ctx) {
    throw new Error('useAppDependencies must be used inside <AppProviders>');
  }
  return ctx;
}
