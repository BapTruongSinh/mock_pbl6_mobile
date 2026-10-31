import {
  createExpoFileSystemAdapter,
  createExpoFileSystemMockStateStorage,
  createFileJournalMockStateStorage,
  createInMemoryMockStateStorage,
  MAX_MOCK_SNAPSHOT_BYTES,
  MOCK_STATE_SCHEMA_VERSION,
  utf8ByteLength,
  type ExpoLegacyFsLike,
} from './mockStateStorage';
import { parseMockStateSnapshot, serializeMockStateSnapshot } from './mockStateSchema';
import { createMockRepository } from './createMockRepository';
import {
  createExpoPendingIntentStorage,
  createFileJournalPendingIntentStorage,
  createInMemoryPendingIntentStorage,
} from '../../shared/native/pendingIntentStorage';

describe('MockStateStorage & PendingIntentStorage (Appendix A Recipe 1.11)', () => {
  const fixedNow = Date.parse('2026-08-27T00:00:00+07:00');

  test('write -> new adapter instance load preserves snapshot data across cold relaunch', async () => {
    const backingFiles = new Map<string, string>();
    const fsAdapter = {
      readFile: async (p: string) => backingFiles.get(p) ?? null,
      writeFile: async (p: string, content: string) => {
        backingFiles.set(p, content);
      },
      moveFile: async (from: string, to: string) => {
        const data = backingFiles.get(from);
        if (data === undefined) {
          throw new Error('Missing temp file');
        }
        backingFiles.set(to, data);
        backingFiles.delete(from);
      },
      deleteFile: async (p: string) => {
        backingFiles.delete(p);
      },
    };

    const adapterA = createFileJournalMockStateStorage({
      filePath: 'file:///app-private/mock-state.json',
      fs: fsAdapter,
    });

    expect(await adapterA.load()).toBeNull();

    const repoA = createMockRepository({
      now: () => fixedNow,
      seed: 'persist-seed',
      storage: adapterA,
    });
    const initA = await repoA.initialize();
    expect(initA.ok).toBe(true);

    // Cold relaunch with a brand new adapter instance reading the same backing file
    const adapterB = createFileJournalMockStateStorage({
      filePath: 'file:///app-private/mock-state.json',
      fs: fsAdapter,
    });

    const repoB = createMockRepository({
      now: () => fixedNow,
      seed: 'different-seed-ignored-when-storage-valid',
      storage: adapterB,
    });
    const initB = await repoB.initialize();
    expect(initB.ok).toBe(true);

    const rawSnapshot = await adapterB.load();
    const parsed = parseMockStateSnapshot(rawSnapshot);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.schemaVersion).toBe(MOCK_STATE_SCHEMA_VERSION);
      expect(parsed.value.seed).toBe('persist-seed');
      expect(parsed.value.trips.some((t) => t.id === 'TR-204')).toBe(true);
      expect(JSON.stringify(parsed.value)).not.toContain('accessToken');
    }

    await adapterB.clear();
    expect(await adapterB.load()).toBeNull();
  });

  test('corrupt, wrong schemaVersion, or oversized snapshot returns reset/error state', async () => {
    const backingFiles = new Map<string, string>();
    const filePath = 'file:///app-private/mock-state.json';
    const fsAdapter = {
      readFile: async (p: string) => backingFiles.get(p) ?? null,
      writeFile: async (p: string, content: string) => {
        backingFiles.set(p, content);
      },
      moveFile: async (from: string, to: string) => {
        const data = backingFiles.get(from);
        if (data === undefined) throw new Error('ENOENT');
        backingFiles.set(to, data);
        backingFiles.delete(from);
      },
      deleteFile: async (p: string) => {
        backingFiles.delete(p);
      },
    };
    const storage = createFileJournalMockStateStorage({ filePath, fs: fsAdapter });

    // 1. Corrupt JSON
    backingFiles.set(filePath, '{corrupt-json');
    await expect(storage.load()).rejects.toThrow(/corrupt|invalid/i);

    // 2. Wrong schema version
    backingFiles.set(filePath, JSON.stringify({ schemaVersion: 999, seed: 'bad' }));
    const wrongVerRaw = await storage.load();
    const wrongVerParsed = parseMockStateSnapshot(wrongVerRaw);
    expect(wrongVerParsed.ok).toBe(false);

    // 3. Oversized snapshot
    backingFiles.set(filePath, 'x'.repeat(MAX_MOCK_SNAPSHOT_BYTES + 128));
    await expect(storage.load()).rejects.toThrow(/oversized|size/i);

    // Repository initialize on wrong schemaVersion recovers and returns validation error
    backingFiles.set(filePath, JSON.stringify({ schemaVersion: 999, seed: 'bad' }));
    const repoWrongVer = createMockRepository({
      now: () => fixedNow,
      seed: 'recovered-from-wrong-ver',
      storage,
    });
    const initWrongVer = await repoWrongVer.initialize();
    expect(initWrongVer.ok).toBe(false);

    // Repository initialize on corrupt JSON reports demo-state-reset and recovers clean seed state
    backingFiles.set(filePath, '{corrupt-json');
    const repo = createMockRepository({
      now: () => fixedNow,
      seed: 'recovered-seed',
      storage,
    });
    const initRes = await repo.initialize();
    expect(initRes.ok).toBe(false);
    if (!initRes.ok) {
      expect(initRes.code).toBe('validation');
      expect(initRes.message).toMatch(/demo-state-reset/i);
    }

    const afterRecovery = parseMockStateSnapshot(await storage.load());
    expect(afterRecovery.ok).toBe(true);
    if (afterRecovery.ok) {
      expect(afterRecovery.value.seed).toBe('recovered-seed');
    }
  });

  test('failed atomic replace does not acknowledge success and preserves previous valid snapshot', async () => {
    const backingFiles = new Map<string, string>();
    const filePath = 'file:///app-private/mock-state.json';
    let failMove = false;

    const storage = createFileJournalMockStateStorage({
      filePath,
      fs: {
        readFile: async (p) => backingFiles.get(p) ?? null,
        writeFile: async (p, content) => {
          backingFiles.set(p, content);
        },
        moveFile: async (from, to) => {
          if (failMove) {
            throw new Error('EIO: atomic rename failed');
          }
          const data = backingFiles.get(from);
          if (data === undefined) throw new Error('Missing temp');
          backingFiles.set(to, data);
          backingFiles.delete(from);
        },
        deleteFile: async (p) => {
          backingFiles.delete(p);
        },
      },
    });

    const repo = createMockRepository({ now: () => fixedNow, seed: 'v1', storage });
    expect((await repo.initialize()).ok).toBe(true);

    failMove = true;
    await expect(
      storage.save({
        schemaVersion: MOCK_STATE_SCHEMA_VERSION,
        seed: 'v2-should-fail',
        updatedAt: fixedNow,
        trips: [],
        seatsByTrip: {},
        holds: [],
        drafts: [],
        reviews: [],
        tickets: [],
        quotes: [],
        refunds: [],
        manifestsByTrip: {},
        driverAccounts: [],
        assignedTripsByDriver: {},
        operations: [],
      }),
    ).rejects.toThrow(/atomic rename failed/i);

    await expect(storage.save({ schemaVersion: 999 })).rejects.toThrow(/demo-state-reset/i);

    // Previous snapshot 'v1' must still be intact
    const loaded = parseMockStateSnapshot(await storage.load());
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.seed).toBe('v1');
    }
  });

  test('in-memory storage lifecycle and schema validation edge cases', async () => {
    const memStorage = createInMemoryMockStateStorage();
    expect(await memStorage.load()).toBeNull();

    const validSnapshot = {
      schemaVersion: MOCK_STATE_SCHEMA_VERSION,
      seed: 'mem-seed',
      updatedAt: fixedNow,
      trips: [],
      seatsByTrip: {},
      holds: [],
      drafts: [],
      reviews: [],
      tickets: [],
      quotes: [],
      refunds: [],
      manifestsByTrip: {},
      driverAccounts: [],
      assignedTripsByDriver: {},
      operations: [],
    };
    await memStorage.save(validSnapshot);
    expect(await memStorage.load()).toEqual(validSnapshot);
    await memStorage.clear();
    expect(await memStorage.load()).toBeNull();

    // Reject embedded accessToken at root or nested inside array
    await expect(
      memStorage.save({
        ...validSnapshot,
        accessToken: 'secret-jwt-token',
      }),
    ).rejects.toThrow(/accessToken|token/i);

    expect(
      parseMockStateSnapshot({
        ...validSnapshot,
        trips: [{ accessToken: 'nested-secret' }],
      }).ok,
    ).toBe(false);

    expect(parseMockStateSnapshot(null).ok).toBe(false);
    expect(parseMockStateSnapshot({ ...validSnapshot, seed: '' }).ok).toBe(false);
    expect(parseMockStateSnapshot({ ...validSnapshot, updatedAt: Number.NaN }).ok).toBe(false);
    expect(parseMockStateSnapshot({ ...validSnapshot, trips: 'not-an-array' }).ok).toBe(false);
    expect(parseMockStateSnapshot({ ...validSnapshot, seatsByTrip: null }).ok).toBe(false);

    const oversizedSnap = {
      ...validSnapshot,
      seed: 's'.repeat(MAX_MOCK_SNAPSHOT_BYTES + 50),
    };
    expect(serializeMockStateSnapshot(oversizedSnap).ok).toBe(false);
  });

  test('F03 regression: parseMockStateSnapshot rejects malformed nested records, nulls, invalid enums, and broken foreign keys', () => {
    const baseRepo = createMockRepository({ now: () => fixedNow, seed: 'f03-seed' });
    expect(baseRepo.kind).toBe('mock');

    const validBase = {
      schemaVersion: MOCK_STATE_SCHEMA_VERSION,
      seed: 'f03-seed',
      updatedAt: fixedNow,
      trips: [
        {
          id: 'TR-204',
          origin: 'TP. Hồ Chí Minh',
          destination: 'Lâm Đồng',
          departureAt: '2026-08-27T07:30:00+07:00',
          arrivalAt: '2026-08-27T13:45:00+07:00',
          fareVnd: 320000,
          status: 'scheduled',
          version: 1,
          pickupStops: [{ id: 'S1', name: 'Stop 1', address: 'Addr 1' }],
          dropoffStops: [{ id: 'S2', name: 'Stop 2', address: 'Addr 2' }],
        },
      ],
      seatsByTrip: {
        'TR-204': [{ id: 'A01', label: 'A01', state: 'available' }],
      },
      holds: [
        {
          id: 'HOLD-1',
          tripId: 'TR-204',
          seatIds: ['A01'],
          expiresAt: fixedNow + 600000,
          version: 1,
        },
      ],
      drafts: [],
      reviews: [],
      tickets: [],
      quotes: [],
      refunds: [],
      manifestsByTrip: { 'TR-204': [] },
      driverAccounts: [{ id: 'DRIVER-1', displayName: 'Driver 1', phone: '0987654321' }],
      assignedTripsByDriver: { 'DRIVER-1': ['TR-204'] },
      operations: [],
    };

    expect(parseMockStateSnapshot(validBase).ok).toBe(true);

    // 1. Nested null in trips array (Supervisor probe line 1)
    expect(parseMockStateSnapshot({ ...validBase, trips: [null] }).ok).toBe(false);

    // 2. Malformed stop inside trip
    expect(
      parseMockStateSnapshot({
        ...validBase,
        trips: [{ ...validBase.trips[0], pickupStops: [null] }],
      }).ok,
    ).toBe(false);

    // 3. Invalid seat state or foreign-key tripId in seatsByTrip
    expect(
      parseMockStateSnapshot({
        ...validBase,
        seatsByTrip: { 'TR-204': [{ id: 'A01', label: 'A01', state: 'invalidState' }] },
      }).ok,
    ).toBe(false);
    expect(
      parseMockStateSnapshot({
        ...validBase,
        seatsByTrip: { 'TR-GHOST': [{ id: 'A01', label: 'A01', state: 'available' }] },
      }).ok,
    ).toBe(false);

    // 4. Malformed ticket with invalid status or unknown tripId
    expect(
      parseMockStateSnapshot({
        ...validBase,
        tickets: [
          {
            id: 'T1',
            bookingId: 'B1',
            accountId: 'CUSTOMER-1',
            code: 'TK-1',
            bookingPhone: '0912345678',
            tripId: 'TR-204',
            seatId: 'A01',
            status: 'not-a-valid-status',
            qrPayload: '{}',
            fareVnd: 1000,
          },
        ],
      }).ok,
    ).toBe(false);

    // 5. Malformed operation record & valid discriminated operation variants
    expect(
      parseMockStateSnapshot({
        ...validBase,
        operations: [
          {
            accountId: 'CUSTOMER-1',
            idempotencyKey: 'k1',
            payloadHash: 'h1',
            record: { kind: 'payment', value: null },
          },
        ],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        operations: [
          {
            accountId: 'CUSTOMER-1',
            idempotencyKey: 'k-unknown',
            payloadHash: 'h1',
            record: { kind: 'unknownKind', value: {} },
          },
        ],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        drafts: [null],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        reviews: [{ draftId: 'D1', passengers: [], totalVnd: 100, version: 1 }],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        quotes: [{ id: 'Q1', bookingId: 'B1', ticketIds: [], refundVnd: 0, feeVnd: 0, version: 1 }],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        refunds: [{ id: 'R1', quoteId: 'Q1', state: 'badState', idempotencyKey: 'ik' }],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        manifestsByTrip: { 'TR-204': [null] },
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        driverAccounts: [null],
      }).ok,
    ).toBe(false);

    expect(
      parseMockStateSnapshot({
        ...validBase,
        assignedTripsByDriver: { 'DRIVER-1': ['TR-NONEXISTENT'] },
      }).ok,
    ).toBe(false);

    // Valid discriminated operations for all 4 kinds pass validation
    expect(
      parseMockStateSnapshot({
        ...validBase,
        operations: [
          {
            accountId: 'CUSTOMER-1',
            idempotencyKey: 'k-pay',
            payloadHash: 'h-pay',
            record: {
              kind: 'payment',
              value: {
                id: 'PAY-1',
                draftId: 'DRAFT-1',
                accountId: 'CUSTOMER-1',
                state: 'succeeded',
                ticketIds: ['T-1'],
                idempotencyKey: 'k-pay',
              },
            },
          },
          {
            accountId: 'CUSTOMER-1',
            idempotencyKey: 'k-ref',
            payloadHash: 'h-ref',
            record: {
              kind: 'refund',
              value: {
                id: 'REF-1',
                quoteId: 'QUOTE-1',
                state: 'succeeded',
                idempotencyKey: 'k-ref',
              },
            },
          },
          {
            accountId: 'DRIVER-1',
            idempotencyKey: 'k-chk',
            payloadHash: 'h-chk',
            record: {
              kind: 'checkIn',
              value: {
                attemptId: 'CHK-1',
                outcome: 'success',
                ticketId: 'T-1',
                idempotencyKey: 'k-chk',
              },
            },
          },
          {
            accountId: 'DRIVER-1',
            idempotencyKey: 'k-tr',
            payloadHash: 'h-tr',
            record: {
              kind: 'tripTransition',
              value: validBase.trips[0],
            },
          },
        ],
      }).ok,
    ).toBe(true);
  });

  test('F04 regression: MAX_MOCK_SNAPSHOT_BYTES enforces actual UTF-8 byte length on multibyte Vietnamese text', async () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('đ')).toBe(2);
    expect(utf8ByteLength('ệ')).toBe(3);
    expect(utf8ByteLength('🚌')).toBe(4);
    expect(utf8ByteLength('\uD800')).toBe(3);
    const validBase = {
      schemaVersion: MOCK_STATE_SCHEMA_VERSION,
      seed: 'ệ'.repeat(100600), // 100,600 UTF-16 code units (< 262,144), but 301,800 UTF-8 bytes (> 262,144)
      updatedAt: fixedNow,
      trips: [],
      seatsByTrip: {},
      holds: [],
      drafts: [],
      reviews: [],
      tickets: [],
      quotes: [],
      refunds: [],
      manifestsByTrip: {},
      driverAccounts: [],
      assignedTripsByDriver: {},
      operations: [],
    };

    const jsonStr = JSON.stringify(validBase);
    expect(jsonStr.length).toBeLessThan(MAX_MOCK_SNAPSHOT_BYTES);
    expect(Buffer.byteLength(jsonStr, 'utf8')).toBeGreaterThan(MAX_MOCK_SNAPSHOT_BYTES);

    const serializedRes = serializeMockStateSnapshot(validBase);
    expect(serializedRes.ok).toBe(false);

    const memStorage = createInMemoryMockStateStorage();
    await expect(memStorage.save(validBase)).rejects.toThrow(/exceeds byte limit|oversized/i);

    const backingFiles = new Map<string, string>();
    const filePath = 'file:///app-private/utf8-oversized.json';
    backingFiles.set(filePath, jsonStr);
    const fileStorage = createFileJournalMockStateStorage({
      filePath,
      fs: {
        readFile: async (p) => backingFiles.get(p) ?? null,
        writeFile: async (p, c) => {
          backingFiles.set(p, c);
        },
        moveFile: async (from, to) => {
          backingFiles.set(to, backingFiles.get(from) ?? '');
          backingFiles.delete(from);
        },
        deleteFile: async (p) => {
          backingFiles.delete(p);
        },
      },
    });
    await expect(fileStorage.load()).rejects.toThrow(/oversized|byte/i);
  });

  test('F06 regression: failed initialize (corrupt load or failed recovery save) blocks subsequent repository reads from returning false success', async () => {
    const backingFiles = new Map<string, string>();
    const filePath = 'file:///app-private/f06-broken.json';
    backingFiles.set(filePath, '{corrupt-json');

    const brokenStorage = createFileJournalMockStateStorage({
      filePath,
      fs: {
        readFile: async (p) => backingFiles.get(p) ?? null,
        writeFile: async () => {
          throw new Error('EIO: disk full during recovery save');
        },
        moveFile: async () => {
          throw new Error('EIO: move failed');
        },
        deleteFile: async () => undefined,
      },
    });

    const repo = createMockRepository({
      now: () => fixedNow,
      seed: 'f06-seed',
      storage: brokenStorage,
    });

    const initRes = await repo.initialize();
    expect(initRes.ok).toBe(false);

    // Subsequent read MUST NOT return ok:true while initialization is in a failed state
    const tripRes = await repo.getTrip('TR-204');
    expect(tripRes.ok).toBe(false);
    const seatsRes = await repo.getSeats('TR-204');
    expect(seatsRes.ok).toBe(false);
    expect((await repo.revalidateHold({ holdId: 'HOLD-204', version: 1 })).ok).toBe(false);

    const custSession = {
      accountId: 'CUSTOMER-1',
      sessionId: 'SES-CUSTOMER-1',
      role: 'customer' as const,
      accessToken: 'mock-token-customer-1',
      expiresAt: fixedNow + 3600000,
    };
    const drvSession = {
      accountId: 'DRIVER-1',
      sessionId: 'SES-DRIVER-1',
      role: 'driver' as const,
      accessToken: 'mock-token-driver-1',
      expiresAt: fixedNow + 3600000,
    };
    expect((await repo.getTickets(custSession)).ok).toBe(false);
    expect((await repo.getTicket('TICKET-204-A01', custSession)).ok).toBe(false);
    expect((await repo.getBookingReview('DRAFT-204', custSession)).ok).toBe(false);
    expect((await repo.getAssignedTrips(drvSession)).ok).toBe(false);
    expect((await repo.getAssignedTrip('TR-204', drvSession)).ok).toBe(false);
    expect((await repo.getDriverAccount(drvSession)).ok).toBe(false);
    expect((await repo.getManifest('TR-204', drvSession)).ok).toBe(false);

    // Concurrent initialize() shares the in-flight initialization deterministically
    let loadCalls = 0;
    const countingStorage = createFileJournalMockStateStorage({
      filePath: 'file:///app-private/f06-concurrent.json',
      fs: {
        readFile: async (p) => {
          loadCalls += 1;
          return backingFiles.get(p) ?? null;
        },
        writeFile: async (p, c) => {
          backingFiles.set(p, c);
        },
        moveFile: async (from, to) => {
          backingFiles.set(to, backingFiles.get(from) ?? '');
          backingFiles.delete(from);
        },
        deleteFile: async (p) => {
          backingFiles.delete(p);
        },
      },
    });
    const concurrentRepo = createMockRepository({
      now: () => fixedNow,
      seed: 'concurrent-seed',
      storage: countingStorage,
    });
    const [res1, res2] = await Promise.all([
      concurrentRepo.initialize(),
      concurrentRepo.initialize(),
    ]);
    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    expect(loadCalls).toBe(1);
  });

  test('PendingIntentStorage isolates accounts, deduplicates keys, rejects sensitive fields, and clears on logout', async () => {
    const intentStorage = createInMemoryPendingIntentStorage();
    expect(await intentStorage.read('')).toEqual([]);

    await intentStorage.write({
      accountId: 'CUSTOMER-1',
      kind: 'payment',
      key: 'idem-pay-c1',
    });
    // Writing same kind+key updates without duplicating
    await intentStorage.write({
      accountId: 'CUSTOMER-1',
      kind: 'payment',
      key: 'idem-pay-c1',
    });
    await intentStorage.write({
      accountId: 'CUSTOMER-2',
      kind: 'refund',
      key: 'idem-ref-c2',
    });

    const c1Intents = await intentStorage.read('CUSTOMER-1');
    expect(c1Intents).toEqual([
      {
        accountId: 'CUSTOMER-1',
        kind: 'payment',
        key: 'idem-pay-c1',
      },
    ]);

    await expect(intentStorage.write(null as unknown as never)).rejects.toThrow(/Invalid/i);
    await expect(intentStorage.write({ accountId: '', kind: 'payment', key: 'k' })).rejects.toThrow(
      /accountId/i,
    );
    await expect(
      intentStorage.write({
        accountId: 'CUSTOMER-1',
        kind: 'invalidKind' as never,
        key: 'k',
      }),
    ).rejects.toThrow(/unsupported kind/i);
    await expect(
      intentStorage.write({ accountId: 'CUSTOMER-1', kind: 'payment', key: '  ' }),
    ).rejects.toThrow(/key is required/i);

    await expect(
      intentStorage.write({
        accountId: 'CUSTOMER-1',
        kind: 'payment',
        key: 'idem-2',
        // @ts-expect-error testing runtime rejection of forbidden token field
        accessToken: 'tok-secret',
      }),
    ).rejects.toThrow(/token|forbidden|invalid/i);

    await intentStorage.clear('CUSTOMER-1');
    expect(await intentStorage.read('CUSTOMER-1')).toEqual([]);
    expect(await intentStorage.read('CUSTOMER-2')).toEqual([
      {
        accountId: 'CUSTOMER-2',
        kind: 'refund',
        key: 'idem-ref-c2',
      },
    ]);

    // Expo FileSystem-backed MockStateStorage and PendingIntentStorage (F06-extended)
    const nativeFiles = new Map<string, string>();
    const fakeExpoFs: ExpoLegacyFsLike = {
      documentDirectory: 'file:///data/user/0/com.mobile.bluecoach/files/',
      getInfoAsync: async (uri: string) => ({ exists: nativeFiles.has(uri) }),
      readAsStringAsync: async (uri: string) => {
        const val = nativeFiles.get(uri);
        if (val === undefined) throw new Error(`Missing ${uri}`);
        return val;
      },
      writeAsStringAsync: async (uri: string, content: string) => {
        nativeFiles.set(uri, content);
      },
      moveAsync: async ({ from, to }) => {
        const val = nativeFiles.get(from);
        if (val === undefined) throw new Error(`Missing ${from}`);
        nativeFiles.set(to, val);
        nativeFiles.delete(from);
      },
      deleteAsync: async (uri: string) => {
        nativeFiles.delete(uri);
      },
    };

    const expoStateStorage = createExpoFileSystemMockStateStorage({
      fileName: 'native-mock-state.json',
      expoFs: fakeExpoFs,
    });
    const nativeRepoA = createMockRepository({
      now: () => fixedNow,
      seed: 'expo-native-seed',
      storage: expoStateStorage,
    });
    expect((await nativeRepoA.initialize()).ok).toBe(true);

    const expoStateStorageB = createExpoFileSystemMockStateStorage({
      fileName: 'native-mock-state.json',
      expoFs: fakeExpoFs,
    });
    const loadedNative = parseMockStateSnapshot(await expoStateStorageB.load());
    expect(loadedNative.ok).toBe(true);
    if (loadedNative.ok) {
      expect(loadedNative.value.seed).toBe('expo-native-seed');
    }
    await expoStateStorageB.clear();
    expect(await expoStateStorageB.load()).toBeNull();

    // Expo PendingIntentStorage persists per-account intents and rejects corrupt JSON
    const expoIntentStorage = createExpoPendingIntentStorage({
      fileName: 'native-intents.json',
      expoFs: fakeExpoFs,
    });
    expect(await expoIntentStorage.read('CUSTOMER-1')).toEqual([]);
    expect(await expoIntentStorage.read('')).toEqual([]);
    await expoIntentStorage.write({
      accountId: 'CUSTOMER-1',
      kind: 'payment',
      key: 'idem-native-1',
    });
    await expoIntentStorage.write({
      accountId: 'CUSTOMER-1',
      kind: 'payment',
      key: 'idem-native-1',
    });
    expect(await expoIntentStorage.read('CUSTOMER-1')).toEqual([
      {
        accountId: 'CUSTOMER-1',
        kind: 'payment',
        key: 'idem-native-1',
      },
    ]);
    await expoIntentStorage.clear('CUSTOMER-1');
    expect(await expoIntentStorage.read('CUSTOMER-1')).toEqual([]);

    // Corrupt pending intent file throws demo-state-reset
    const corruptIntentPath = 'file:///data/user/0/com.mobile.bluecoach/files/corrupt-intents.json';
    nativeFiles.set(corruptIntentPath, '{bad-json');
    const corruptIntentStorage = createFileJournalPendingIntentStorage({
      filePath: corruptIntentPath,
      fs: createExpoFileSystemAdapter({ expoFs: fakeExpoFs }),
    });
    await expect(corruptIntentStorage.read('CUSTOMER-1')).rejects.toThrow(/demo-state-reset/i);

    // strictNative throws when documentDirectory is null
    const nullDocFs: ExpoLegacyFsLike = {
      ...fakeExpoFs,
      documentDirectory: null,
    };
    const strictAdapter = createExpoFileSystemAdapter({ expoFs: nullDocFs });
    await expect(strictAdapter.readFile('file:///x')).rejects.toThrow(/unavailable/i);
    await expect(strictAdapter.writeFile('file:///x', 'a')).rejects.toThrow(/unavailable/i);
    await expect(strictAdapter.moveFile('file:///a', 'file:///b')).rejects.toThrow(/unavailable/i);
    await expect(strictAdapter.deleteFile('file:///x')).rejects.toThrow(/unavailable/i);
  });

  test('F08 & F09 regression: real Expo adapter preserves committed snapshot/intents on failed moveAsync and rejects missing documentDirectory by default without silent memory fallback', async () => {
    const nativeFiles = new Map<string, string>();
    let failNativeMove = false;
    const fakeExpoFs: ExpoLegacyFsLike = {
      documentDirectory: 'file:///data/user/0/com.mobile.bluecoach/files/',
      getInfoAsync: async (uri: string) => ({ exists: nativeFiles.has(uri) }),
      readAsStringAsync: async (uri: string) => {
        const val = nativeFiles.get(uri);
        if (val === undefined) throw new Error(`ENOENT: ${uri}`);
        return val;
      },
      writeAsStringAsync: async (uri: string, content: string) => {
        nativeFiles.set(uri, content);
      },
      moveAsync: async ({ from, to }) => {
        if (failNativeMove) {
          throw new Error('EIO: native moveAsync failed');
        }
        const val = nativeFiles.get(from);
        if (val === undefined) throw new Error(`ENOENT: ${from}`);
        nativeFiles.set(to, val);
        nativeFiles.delete(from);
      },
      deleteAsync: async (uri: string) => {
        nativeFiles.delete(uri);
      },
    };

    const expoStateStorage = createExpoFileSystemMockStateStorage({
      fileName: 'f08-state.json',
      expoFs: fakeExpoFs,
    });
    const repo = createMockRepository({
      now: () => fixedNow,
      seed: 'f08-committed-v1',
      storage: expoStateStorage,
    });
    expect((await repo.initialize()).ok).toBe(true);

    const committedRawBefore = await expoStateStorage.load();
    const committedBefore = parseMockStateSnapshot(committedRawBefore);
    expect(committedBefore.ok).toBe(true);

    // Inject moveAsync failure on the real Expo adapter path
    failNativeMove = true;
    if (committedBefore.ok) {
      await expect(
        expoStateStorage.save({
          ...committedBefore.value,
          seed: 'f08-uncommitted-v2',
        }),
      ).rejects.toThrow(/moveAsync failed/i);
    }

    // F08: Previously committed snapshot MUST still survive and be readable after failed moveAsync
    const survivingRaw = await expoStateStorage.load();
    expect(survivingRaw).not.toBeNull();
    const survivingParsed = parseMockStateSnapshot(survivingRaw);
    expect(survivingParsed.ok).toBe(true);
    if (survivingParsed.ok) {
      expect(survivingParsed.value.seed).toBe('f08-committed-v1');
    }

    // Same guarantee for PendingIntentStorage via real Expo adapter
    failNativeMove = false;
    const expoIntentStorage = createExpoPendingIntentStorage({
      fileName: 'f08-intents.json',
      expoFs: fakeExpoFs,
    });
    await expoIntentStorage.write({
      accountId: 'CUSTOMER-1',
      kind: 'payment',
      key: 'idem-committed-1',
    });

    failNativeMove = true;
    await expect(
      expoIntentStorage.write({
        accountId: 'CUSTOMER-1',
        kind: 'refund',
        key: 'idem-uncommitted-2',
      }),
    ).rejects.toThrow(/moveAsync failed/i);

    expect(await expoIntentStorage.read('CUSTOMER-1')).toEqual([
      {
        accountId: 'CUSTOMER-1',
        kind: 'payment',
        key: 'idem-committed-1',
      },
    ]);

    // F09: Missing documentDirectory by default (without any strictNative opt-in) MUST fail explicitly
    const missingNativeFs: ExpoLegacyFsLike = {
      ...fakeExpoFs,
      documentDirectory: null,
    };
    const defaultMissingStateStorage = createExpoFileSystemMockStateStorage({
      expoFs: missingNativeFs,
    });
    await expect(defaultMissingStateStorage.load()).rejects.toThrow(/unavailable/i);
    if (committedBefore.ok) {
      await expect(defaultMissingStateStorage.save(committedBefore.value)).rejects.toThrow(
        /unavailable/i,
      );
    }

    const defaultMissingIntentStorage = createExpoPendingIntentStorage({
      expoFs: missingNativeFs,
    });
    await expect(defaultMissingIntentStorage.read('CUSTOMER-1')).rejects.toThrow(/unavailable/i);
    await expect(
      defaultMissingIntentStorage.write({
        accountId: 'CUSTOMER-1',
        kind: 'payment',
        key: 'idem-should-fail',
      }),
    ).rejects.toThrow(/unavailable/i);
  });
});
