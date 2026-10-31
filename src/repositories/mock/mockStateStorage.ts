import * as ExpoLegacyFileSystem from 'expo-file-system/legacy';
import type { MockStateStorage } from '../../domain/types';
import {
  MAX_MOCK_SNAPSHOT_BYTES,
  MOCK_STATE_SCHEMA_VERSION,
  parseMockStateSnapshot,
  serializeMockStateSnapshot,
  utf8ByteLength,
} from './mockStateSchema';

export { MAX_MOCK_SNAPSHOT_BYTES, MOCK_STATE_SCHEMA_VERSION, utf8ByteLength };

export interface AtomicFileAdapter {
  readFile(filePath: string): Promise<string | null>;
  writeFile(filePath: string, content: string): Promise<void>;
  moveFile(fromPath: string, toPath: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
}

export interface ExpoLegacyFsLike {
  documentDirectory: string | null;
  getInfoAsync(fileUri: string): Promise<{ exists: boolean }>;
  readAsStringAsync(fileUri: string): Promise<string>;
  writeAsStringAsync(fileUri: string, contents: string): Promise<void>;
  moveAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
}

export function requireExpoDocumentDirectory(expoFs: ExpoLegacyFsLike): string {
  if (
    typeof expoFs.documentDirectory !== 'string' ||
    expoFs.documentDirectory.trim().length === 0
  ) {
    throw new Error('demo-state-reset: Expo documentDirectory is unavailable');
  }
  return expoFs.documentDirectory.endsWith('/')
    ? expoFs.documentDirectory
    : `${expoFs.documentDirectory}/`;
}

export function createExpoFileSystemAdapter(options?: {
  expoFs?: ExpoLegacyFsLike;
}): AtomicFileAdapter {
  const expoFs: ExpoLegacyFsLike = options?.expoFs ?? ExpoLegacyFileSystem;

  return {
    async readFile(filePath: string): Promise<string | null> {
      requireExpoDocumentDirectory(expoFs);
      const info = await expoFs.getInfoAsync(filePath);
      if (!info.exists) {
        return null;
      }
      return expoFs.readAsStringAsync(filePath);
    },

    async writeFile(filePath: string, content: string): Promise<void> {
      requireExpoDocumentDirectory(expoFs);
      await expoFs.writeAsStringAsync(filePath, content);
    },

    async moveFile(fromPath: string, toPath: string): Promise<void> {
      requireExpoDocumentDirectory(expoFs);
      await expoFs.moveAsync({ from: fromPath, to: toPath });
    },

    async deleteFile(filePath: string): Promise<void> {
      requireExpoDocumentDirectory(expoFs);
      await expoFs.deleteAsync(filePath, { idempotent: true });
    },
  };
}

export function createInMemoryMockStateStorage(): MockStateStorage {
  let serializedState: string | null = null;

  return {
    async load(): Promise<unknown> {
      if (serializedState === null) {
        return null;
      }
      const byteLength = utf8ByteLength(serializedState);
      if (byteLength > MAX_MOCK_SNAPSHOT_BYTES) {
        throw new Error(
          `demo-state-reset: Oversized mock snapshot in memory (${byteLength} > ${MAX_MOCK_SNAPSHOT_BYTES})`,
        );
      }
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(serializedState);
      } catch {
        throw new Error('demo-state-reset: Corrupt JSON in memory mock state');
      }
      const validated = parseMockStateSnapshot(parsedJson);
      if (!validated.ok) {
        throw new Error(validated.message);
      }
      return validated.value;
    },

    async save(snapshot: unknown): Promise<void> {
      const serialized = serializeMockStateSnapshot(snapshot);
      if (!serialized.ok) {
        throw new Error(serialized.message);
      }
      serializedState = serialized.value;
    },

    async clear(): Promise<void> {
      serializedState = null;
    },
  };
}

export function createFileJournalMockStateStorage(options: {
  filePath: string | (() => string);
  fs: AtomicFileAdapter;
}): MockStateStorage {
  const { filePath, fs } = options;
  const resolvePrimaryPath = (): string => (typeof filePath === 'function' ? filePath() : filePath);

  return {
    async load(): Promise<unknown> {
      const primaryPath = resolvePrimaryPath();
      const content = await fs.readFile(primaryPath);
      if (content === null) {
        return null;
      }
      const byteLength = utf8ByteLength(content);
      if (byteLength > MAX_MOCK_SNAPSHOT_BYTES) {
        throw new Error(
          `demo-state-reset: Oversized mock state snapshot (${byteLength} > ${MAX_MOCK_SNAPSHOT_BYTES} bytes)`,
        );
      }
      try {
        return JSON.parse(content) as unknown;
      } catch {
        throw new Error('demo-state-reset: Corrupt JSON in mock state snapshot file');
      }
    },

    async save(snapshot: unknown): Promise<void> {
      const serialized = serializeMockStateSnapshot(snapshot);
      if (!serialized.ok) {
        throw new Error(serialized.message);
      }
      const primaryPath = resolvePrimaryPath();
      const tempPath = `${primaryPath}.tmp`;
      await fs.writeFile(tempPath, serialized.value);
      await fs.moveFile(tempPath, primaryPath);
    },

    async clear(): Promise<void> {
      const primaryPath = resolvePrimaryPath();
      const tempPath = `${primaryPath}.tmp`;
      await fs.deleteFile(tempPath).catch(() => undefined);
      await fs.deleteFile(primaryPath).catch(() => undefined);
    },
  };
}

export function createExpoFileSystemMockStateStorage(options?: {
  fileName?: string;
  fs?: AtomicFileAdapter;
  expoFs?: ExpoLegacyFsLike;
}): MockStateStorage {
  const fileName = options?.fileName ?? 'mock-state-snapshot.v1.json';
  const expoFs: ExpoLegacyFsLike = options?.expoFs ?? ExpoLegacyFileSystem;
  const fs = options?.fs ?? createExpoFileSystemAdapter({ expoFs });

  return createFileJournalMockStateStorage({
    filePath: () => `${requireExpoDocumentDirectory(expoFs)}${fileName}`,
    fs,
  });
}
