import * as fs from 'expo-file-system/legacy';
import { createMockRepository } from '../repositories/mock/createMockRepository';
import { runNativeFailedSaveProbe } from './nativeStorageProbe';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///private/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  moveAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));
const dir = 'file:///private/';
let disk: Map<string, string>;
let rejectMove: boolean;
beforeEach(async () => {
  disk = new Map();
  rejectMove = true;
  jest.mocked(fs.getInfoAsync).mockImplementation(async (uri) => ({
    exists: disk.has(uri),
    isDirectory: false,
    uri,
    modificationTime: 0,
    size: 0,
  }));
  jest.mocked(fs.readAsStringAsync).mockImplementation(async (uri) => disk.get(uri) ?? '');
  jest.mocked(fs.writeAsStringAsync).mockImplementation(async (uri, value) => {
    disk.set(uri, value);
  });
  jest.mocked(fs.moveAsync).mockImplementation(async ({ from, to }) => {
    if (rejectMove && to === dir) throw new Error('Native move rejected directory destination');
    const value = disk.get(from);
    if (value === undefined) throw new Error('Missing source');
    disk.set(to, value);
    disk.delete(from);
  });
  jest.mocked(fs.deleteAsync).mockImplementation(async (uri) => {
    disk.delete(uri);
  });
  const repository = createMockRepository({
    now: () => 0,
    seed: 'native-probe-test',
    storage: {
      async load() {
        return null;
      },
      async save(value) {
        disk.set(`${dir}mock-state-snapshot.v1.json`, JSON.stringify(value));
      },
      async clear() {},
    },
  });
  expect((await repository.initialize()).ok).toBe(true);
});

test('failed native replacement is not acknowledged and preserves reloadable committed snapshot', async () => {
  const runtime = disk.get(`${dir}mock-state-snapshot.v1.json`);
  await runNativeFailedSaveProbe();
  const proof = JSON.parse(disk.get(`${dir}foundation-failed-save-proof.json`) ?? '{}') as Record<
    string,
    unknown
  >;
  expect(proof).toMatchObject({
    passed: true,
    moveAttempted: true,
    saveAcknowledged: false,
    priorSnapshotPreserved: true,
    tempFileWritten: true,
    reloadMatchesCommitted: true,
  });
  expect(disk.get(`${dir}mock-state-snapshot.v1.json`)).toBe(runtime);
  expect(disk.has(`${dir}foundation-failed-save-snapshot.json`)).toBe(false);
});

test('unexpected successful move cannot be reported as verified failed-save evidence', async () => {
  rejectMove = false;
  await expect(runNativeFailedSaveProbe()).rejects.toThrow('failed-save contract violated');
  const proof = JSON.parse(disk.get(`${dir}foundation-failed-save-proof.json`) ?? '{}') as Record<
    string,
    unknown
  >;
  expect(proof).toMatchObject({ passed: false, saveAcknowledged: true, tempFileWritten: false });
});

test('missing runtime snapshot blocks native probe', async () => {
  disk.delete(`${dir}mock-state-snapshot.v1.json`);
  await expect(runNativeFailedSaveProbe()).rejects.toThrow('missing runtime snapshot');
});
