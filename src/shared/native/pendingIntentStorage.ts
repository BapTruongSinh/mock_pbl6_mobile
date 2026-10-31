import * as ExpoLegacyFileSystem from 'expo-file-system/legacy';
import type { OperationKind, PendingIntent, PendingIntentStorage } from '../../domain/types';
import {
  createExpoFileSystemAdapter,
  requireExpoDocumentDirectory,
  type AtomicFileAdapter,
  type ExpoLegacyFsLike,
} from '../../repositories/mock/mockStateStorage';

const VALID_OPERATION_KINDS: ReadonlySet<OperationKind> = new Set([
  'payment',
  'refund',
  'checkIn',
  'tripTransition',
]);

const FORBIDDEN_INTENT_KEYS = [
  'accessToken',
  'token',
  'qrPayload',
  'phone',
  'bookingPhone',
  'password',
] as const;

export function validatePendingIntent(candidate: unknown): PendingIntent {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Invalid pending intent: must be an object');
  }

  const record = candidate as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (
      FORBIDDEN_INTENT_KEYS.some((forbidden) => key.toLowerCase() === forbidden.toLowerCase()) ||
      (key !== 'accountId' && key !== 'kind' && key !== 'key')
    ) {
      throw new Error(`Forbidden or unexpected field "${key}" in PendingIntent`);
    }
  }

  const { accountId, kind, key } = record;
  if (typeof accountId !== 'string' || accountId.trim().length === 0) {
    throw new Error('Invalid pending intent: accountId is required');
  }
  if (typeof kind !== 'string' || !VALID_OPERATION_KINDS.has(kind as OperationKind)) {
    throw new Error(`Invalid pending intent: unsupported kind "${String(kind)}"`);
  }
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new Error('Invalid pending intent: key is required');
  }

  return {
    accountId,
    kind: kind as OperationKind,
    key,
  };
}

export function createInMemoryPendingIntentStorage(): PendingIntentStorage {
  const intentsByAccount = new Map<string, PendingIntent[]>();

  return {
    async read(accountId: string): Promise<PendingIntent[]> {
      if (typeof accountId !== 'string' || accountId.trim().length === 0) {
        return [];
      }
      const list = intentsByAccount.get(accountId) ?? [];
      return list.map((item) => ({ ...item }));
    },

    async write(intent: PendingIntent): Promise<void> {
      const validated = validatePendingIntent(intent);
      const existing = intentsByAccount.get(validated.accountId) ?? [];
      const filtered = existing.filter(
        (entry) => !(entry.kind === validated.kind && entry.key === validated.key),
      );
      filtered.push(validated);
      intentsByAccount.set(validated.accountId, filtered);
    },

    async clear(accountId: string): Promise<void> {
      intentsByAccount.delete(accountId);
    },
  };
}

export function createFileJournalPendingIntentStorage(options: {
  filePath: string | (() => string);
  fs: AtomicFileAdapter;
}): PendingIntentStorage {
  const { filePath, fs } = options;
  const resolvePrimaryPath = (): string => (typeof filePath === 'function' ? filePath() : filePath);

  const loadAll = async (): Promise<Record<string, PendingIntent[]>> => {
    const primaryPath = resolvePrimaryPath();
    const raw = await fs.readFile(primaryPath);
    if (raw === null) {
      return {};
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('demo-state-reset: Corrupt JSON in pending intent storage file');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('demo-state-reset: Pending intent storage root must be an object');
    }
    const result: Record<string, PendingIntent[]> = {};
    for (const [accId, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) {
        throw new Error(`demo-state-reset: PendingIntent list for ${accId} must be an array`);
      }
      result[accId] = list.map((item) => validatePendingIntent(item));
    }
    return result;
  };

  const saveAll = async (map: Record<string, PendingIntent[]>): Promise<void> => {
    const primaryPath = resolvePrimaryPath();
    const tempPath = `${primaryPath}.tmp`;
    const serialized = JSON.stringify(map);
    await fs.writeFile(tempPath, serialized);
    await fs.moveFile(tempPath, primaryPath);
  };

  return {
    async read(accountId: string): Promise<PendingIntent[]> {
      if (typeof accountId !== 'string' || accountId.trim().length === 0) {
        return [];
      }
      const all = await loadAll();
      return (all[accountId] ?? []).map((item) => ({ ...item }));
    },

    async write(intent: PendingIntent): Promise<void> {
      const validated = validatePendingIntent(intent);
      const all = await loadAll();
      const existing = all[validated.accountId] ?? [];
      const filtered = existing.filter(
        (entry) => !(entry.kind === validated.kind && entry.key === validated.key),
      );
      filtered.push(validated);
      all[validated.accountId] = filtered;
      await saveAll(all);
    },

    async clear(accountId: string): Promise<void> {
      const all = await loadAll();
      delete all[accountId];
      await saveAll(all);
    },
  };
}

export function createExpoPendingIntentStorage(options?: {
  fileName?: string;
  fs?: AtomicFileAdapter;
  expoFs?: ExpoLegacyFsLike;
}): PendingIntentStorage {
  const fileName = options?.fileName ?? 'pending-intents.v1.json';
  const expoFs: ExpoLegacyFsLike = options?.expoFs ?? ExpoLegacyFileSystem;
  const fs = options?.fs ?? createExpoFileSystemAdapter({ expoFs });

  return createFileJournalPendingIntentStorage({
    filePath: () => `${requireExpoDocumentDirectory(expoFs)}${fileName}`,
    fs,
  });
}
