import { sha256 } from 'js-sha256';
import * as ExpoLegacyFileSystem from 'expo-file-system/legacy';
import type { Role } from '../../domain/types';
import {
  createExpoFileSystemAdapter,
  requireExpoDocumentDirectory,
  type AtomicFileAdapter,
  type ExpoLegacyFsLike,
} from './mockStateStorage';

export interface MockPersistedAccount {
  accountId: string;
  identifiers: string[];
  password: string;
  passwordAliases: string[];
  role: Role;
  fullName: string;
  avatarUri?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
}

export interface MockSessionVerificationRecord {
  sessionId: string;
  accountId: string;
  role: Role;
  tokenHash: string; // SHA-256 digest of accessToken, NEVER plaintext accessToken
  expiresAt: number;
}

export interface MockAuthSnapshot {
  version: 1;
  accounts: MockPersistedAccount[];
  sessions: MockSessionVerificationRecord[];
}

export interface MockAuthStorage {
  load(): Promise<MockAuthSnapshot | null>;
  save(snapshot: MockAuthSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export function sha256Hex(ascii: string): string {
  return sha256(ascii);
}

export function validateMockAuthSnapshot(raw: unknown): MockAuthSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Partial<MockAuthSnapshot>;
  if (obj.version !== 1) {
    return null;
  }
  if (!Array.isArray(obj.accounts) || !Array.isArray(obj.sessions)) {
    return null;
  }

  const validAccounts: MockPersistedAccount[] = [];
  for (const acc of obj.accounts) {
    if (
      !acc ||
      typeof acc !== 'object' ||
      typeof acc.accountId !== 'string' ||
      !Array.isArray(acc.identifiers) ||
      typeof acc.password !== 'string' ||
      (acc.role !== 'customer' && acc.role !== 'driver') ||
      (acc.avatarUri !== undefined &&
        (typeof acc.avatarUri !== 'string' || !acc.avatarUri.startsWith('file://'))) ||
      (acc.dateOfBirth !== undefined &&
        (typeof acc.dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(acc.dateOfBirth))) ||
      typeof acc.fullName !== 'string'
    ) {
      return null;
    }
    validAccounts.push(acc as MockPersistedAccount);
  }

  const validSessions: MockSessionVerificationRecord[] = [];
  for (const s of obj.sessions) {
    if (
      !s ||
      typeof s !== 'object' ||
      typeof s.sessionId !== 'string' ||
      typeof s.accountId !== 'string' ||
      (s.role !== 'customer' && s.role !== 'driver') ||
      typeof s.tokenHash !== 'string' ||
      typeof s.expiresAt !== 'number' ||
      !Number.isFinite(s.expiresAt)
    ) {
      return null;
    }
    validSessions.push(s as MockSessionVerificationRecord);
  }

  return {
    version: 1,
    accounts: validAccounts,
    sessions: validSessions,
  };
}

export function createInMemoryMockAuthStorage(initial?: MockAuthSnapshot): MockAuthStorage {
  let current: MockAuthSnapshot | null = initial ? structuredClone(initial) : null;

  return {
    async load(): Promise<MockAuthSnapshot | null> {
      return current ? structuredClone(current) : null;
    },
    async save(snapshot: MockAuthSnapshot): Promise<void> {
      current = structuredClone(snapshot);
    },
    async clear(): Promise<void> {
      current = null;
    },
  };
}

export function createFileJournalMockAuthStorage(options: {
  filePath: string | (() => string);
  fs: AtomicFileAdapter;
}): MockAuthStorage {
  const { filePath, fs } = options;
  const resolvePrimaryPath = (): string => (typeof filePath === 'function' ? filePath() : filePath);

  return {
    async load(): Promise<MockAuthSnapshot | null> {
      const primaryPath = resolvePrimaryPath();
      const raw = await fs.readFile(primaryPath);
      if (raw === null || raw.trim().length === 0) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        return validateMockAuthSnapshot(parsed);
      } catch {
        return null;
      }
    },

    async save(snapshot: MockAuthSnapshot): Promise<void> {
      const primaryPath = resolvePrimaryPath();
      const tempPath = `${primaryPath}.tmp`;
      const serialized = JSON.stringify(snapshot, null, 2);
      await fs.writeFile(tempPath, serialized);
      await fs.moveFile(tempPath, primaryPath);
    },

    async clear(): Promise<void> {
      const primaryPath = resolvePrimaryPath();
      await fs.deleteFile(primaryPath);
      const tempPath = `${primaryPath}.tmp`;
      try {
        await fs.deleteFile(tempPath);
      } catch {
        // temp file may not exist
      }
    },
  };
}

export function createExpoFileSystemMockAuthStorage(options?: {
  fileName?: string;
  fs?: AtomicFileAdapter;
  expoFs?: ExpoLegacyFsLike;
}): MockAuthStorage {
  const fileName = options?.fileName ?? 'mock-auth-snapshot.v1.json';
  const expoFs: ExpoLegacyFsLike = options?.expoFs ?? ExpoLegacyFileSystem;
  const fs: AtomicFileAdapter = options?.fs ?? createExpoFileSystemAdapter({ expoFs });

  const resolvePath = (): string => {
    const dir = requireExpoDocumentDirectory(expoFs);
    return `${dir}${fileName}`;
  };

  return createFileJournalMockAuthStorage({
    filePath: resolvePath,
    fs,
  });
}
