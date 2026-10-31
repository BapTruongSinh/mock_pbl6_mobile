import {
  createExpoFileSystemAdapter,
  createFileJournalMockStateStorage,
  requireExpoDocumentDirectory,
} from '../repositories/mock/mockStateStorage';
import * as ExpoFileSystem from 'expo-file-system/legacy';

// Invoked only through the production-blocked debug harness. Uses dedicated app-private
// files and a real failing native move, leaving the runtime repository snapshot intact.
export async function runNativeFailedSaveProbe(): Promise<void> {
  const dir = requireExpoDocumentDirectory(ExpoFileSystem);
  const fs = createExpoFileSystemAdapter();
  const snapshotRaw = await fs.readFile(`${dir}mock-state-snapshot.v1.json`);
  if (!snapshotRaw) throw new Error('native-storage-probe: missing runtime snapshot');
  const snapshot: unknown = JSON.parse(snapshotRaw);
  const primary = `${dir}foundation-failed-save-snapshot.json`;
  const good = createFileJournalMockStateStorage({ filePath: primary, fs });
  await good.save(snapshot);
  const before = await fs.readFile(primary);
  let moveAttempted = false;
  let saveAcknowledged = false;
  let errorMessage: string | null = null;
  const failing = createFileJournalMockStateStorage({
    filePath: primary,
    fs: {
      ...fs,
      async moveFile(from, _to): Promise<void> {
        moveAttempted = true;
        // Native move of an existing temp file onto a nonempty directory must fail.
        await fs.moveFile(from, dir);
      },
    },
  });
  try {
    await failing.save(snapshot);
    saveAcknowledged = true;
  } catch (error: unknown) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
  const after = await fs.readFile(primary);
  const temp = await fs.readFile(`${primary}.tmp`);
  const reloaded = await good.load();
  const passed =
    moveAttempted &&
    !saveAcknowledged &&
    Boolean(errorMessage) &&
    before === after &&
    temp !== null &&
    JSON.stringify(reloaded) === JSON.stringify(snapshot);
  await fs.writeFile(
    `${dir}foundation-failed-save-proof.json`,
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        method: 'real Expo filesystem write and failing move onto app documents directory',
        moveAttempted,
        saveAcknowledged,
        errorMessage,
        priorSnapshotPreserved: before === after,
        tempFileWritten: temp !== null,
        reloadMatchesCommitted: JSON.stringify(reloaded) === JSON.stringify(snapshot),
        passed,
      },
      null,
      2,
    ),
  );
  await good.clear();
  if (!passed) throw new Error('native-storage-probe: failed-save contract violated');
}
