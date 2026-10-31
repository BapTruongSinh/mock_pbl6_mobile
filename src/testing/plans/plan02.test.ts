import { normalizeTicketCode, normalizeVietnamPhone } from '../../domain/lookup';
import { resolveEntry } from '../../navigation/guards';
import { parseTicketQr, requestCameraPermission } from '../../shared/native/cameraGateway';
import {
  clearSession,
  readSession,
  saveSession,
  setSecureSessionStorageAdapter,
  SECURE_SESSION_KEY,
} from '../../shared/native/secureSessionStorage';
import { createTestWorld } from '../createTestWorld';
import {
  createFileJournalMockAuthStorage,
  createInMemoryMockAuthStorage,
  sha256Hex,
} from '../../repositories/mock/mockAuthStorage';
import { createMockRepository } from '../../repositories/mock/createMockRepository';

describe('Plan 02 Task 1 — Core Domain, Repository, and Security Boundaries', () => {
  const memoryStore = new Map<string, string>();
  const testAdapter = {
    async getItem(key: string): Promise<string | null> {
      return memoryStore.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      memoryStore.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      memoryStore.delete(key);
    },
  };

  beforeEach(() => {
    memoryStore.clear();
    setSecureSessionStorageAdapter(testAdapter);
  });

  afterAll(() => {
    setSecureSessionStorageAdapter(null);
  });

  describe('resolveEntry route guard', () => {
    it('resolves null session to Guest entry', () => {
      expect(resolveEntry(null)).toBe('Guest');
    });

    it('resolves customer session to Customer entry', () => {
      const world = createTestWorld();
      expect(resolveEntry(world.sessions.customer)).toBe('Customer');
    });

    it('resolves driver session to Driver entry', () => {
      const world = createTestWorld();
      expect(resolveEntry(world.sessions.driver)).toBe('Driver');
    });

    it('fails closed to Guest for unknown/invalid role session', () => {
      const invalidRoleSession = {
        accountId: 'acc-unknown',
        sessionId: 'sess-unknown',
        role: 'admin' as unknown as import('../../domain/types').Role,
        accessToken: 'tok-unknown',
        expiresAt: Date.now() + 3600000,
      };
      expect(resolveEntry(invalidRoleSession)).toBe('Guest');
    });
  });

  describe('Ticket code normalization', () => {
    it('trims leading/trailing whitespace and converts to uppercase', () => {
      expect(normalizeTicketCode(' tk-a01 ')).toBe('TK-A01');
      expect(normalizeTicketCode('tk-b99')).toBe('TK-B99');
      expect(normalizeTicketCode('  tk-c03  ')).toBe('TK-C03');
    });
  });

  describe('Vietnam phone normalization', () => {
    it('normalizes +84 phone with dashes/spaces to standard 0-prefixed 10-digit phone', () => {
      expect(normalizeVietnamPhone('+84 912-345-678')).toEqual({
        ok: true,
        value: '0912345678',
      });
      expect(normalizeVietnamPhone('0912.345.678')).toEqual({
        ok: true,
        value: '0912345678',
      });
      expect(normalizeVietnamPhone('+84(912)345678')).toEqual({
        ok: true,
        value: '0912345678',
      });
    });

    it('rejects foreign phone numbers and invalid lengths', () => {
      expect(normalizeVietnamPhone('+1 5551234567').ok).toBe(false);
      expect(normalizeVietnamPhone('091234567').ok).toBe(false); // 9 digits
      expect(normalizeVietnamPhone('09123456789').ok).toBe(false); // 11 digits
      expect(normalizeVietnamPhone('1912345678').ok).toBe(false); // does not start with 0
    });
  });

  describe('Ticket lookup repository contract', () => {
    it('rejects lookup when code is correct but phone is wrong (generic mismatch)', async () => {
      const world = createTestWorld();
      const res = await world.repository.lookupTicket({
        code: world.fixtures.ticket.code,
        phone: '0900000000',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe('notFound');
      }
    });

    it('rejects lookup when phone is correct but code is wrong', async () => {
      const world = createTestWorld();
      const res = await world.repository.lookupTicket({
        code: 'TK-NONEXISTENT',
        phone: world.fixtures.ticket.bookingPhone,
      });
      expect(res.ok).toBe(false);
    });

    it('succeeds manual lookup with matching code and phone', async () => {
      const world = createTestWorld();
      const res = await world.repository.lookupTicket({
        code: world.fixtures.ticket.code,
        phone: world.fixtures.ticket.bookingPhone,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.code).toBe(world.fixtures.ticket.code);
        expect(res.value.id).toBe(world.fixtures.ticket.id);
      }
    });

    it('succeeds QR-alone lookup without requiring phone number or OTP', async () => {
      const world = createTestWorld();
      const res = await world.repository.lookupTicket({
        qrPayload: world.fixtures.ticket.qrPayload,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.code).toBe(world.fixtures.ticket.code);
        expect(res.value.status).toBe(world.fixtures.ticket.status);
      }
    });
  });

  describe('Camera gateway and QR parsing', () => {
    it('parses valid ticket QR payload and verifies signature format', () => {
      const payload = JSON.stringify({
        version: 1,
        ticketCode: 'TK-A01',
        signature: 'mock:TK-A01',
      });
      const parsed = parseTicketQr(payload);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.value.ticketCode).toBe('TK-A01');
        expect(parsed.value.version).toBe(1);
      }
    });

    it('rejects malformed or oversized QR payloads', () => {
      expect(parseTicketQr('not-json').ok).toBe(false);
      expect(parseTicketQr(JSON.stringify({ version: 2, ticketCode: 'TK-1' })).ok).toBe(false);
      expect(
        parseTicketQr(
          JSON.stringify({
            version: 1,
            ticketCode: 'TK-1',
            signature: 'invalid-sig',
          }),
        ).ok,
      ).toBe(false);
      const oversized = 'a'.repeat(2049);
      expect(parseTicketQr(oversized).ok).toBe(false);
    });

    it('returns valid camera permission status', async () => {
      const status = await requestCameraPermission();
      expect(['granted', 'denied', 'blocked']).toContain(status);
    });
  });

  describe('Secure session storage with full runtime shape and TTL validation', () => {
    it('saves, reads, and clears valid session correctly', async () => {
      const world = createTestWorld();
      const validSession = {
        ...world.sessions.customer,
        expiresAt: world.clock.now() + 3600000,
      };
      await saveSession(validSession);
      const loaded = await readSession(world.clock.now());
      expect(loaded).not.toBeNull();
      expect(loaded?.accountId).toBe(validSession.accountId);
      expect(loaded?.role).toBe('customer');

      await clearSession();
      const afterClear = await readSession(world.clock.now());
      expect(afterClear).toBeNull();
    });

    it('rejects and clears expired session at exact boundary (now >= expiresAt)', async () => {
      const expiredSession = {
        accountId: 'acc-cust-expired',
        sessionId: 'sess-cust-expired',
        role: 'customer' as const,
        accessToken: 'tok-expired',
        expiresAt: 5000,
      };
      await saveSession(expiredSession);
      // Boundary check: now === expiresAt must fail closed
      const loadedAtBoundary = await readSession(5000);
      expect(loadedAtBoundary).toBeNull();

      // Check storage was cleaned
      expect(memoryStore.has(SECURE_SESSION_KEY)).toBe(false);
    });

    it('rejects and clears malformed or incomplete stored session shapes', async () => {
      // Missing sessionId
      memoryStore.set(
        SECURE_SESSION_KEY,
        JSON.stringify({
          accountId: 'ACC-1',
          role: 'customer',
          accessToken: 'tok',
          expiresAt: 100000,
        }),
      );
      expect(await readSession(1000)).toBeNull();

      // Unknown role
      memoryStore.set(
        SECURE_SESSION_KEY,
        JSON.stringify({
          accountId: 'ACC-1',
          sessionId: 'SESS-1',
          role: 'superuser',
          accessToken: 'tok',
          expiresAt: 100000,
        }),
      );
      expect(await readSession(1000)).toBeNull();

      // Non-finite or negative expiresAt
      memoryStore.set(
        SECURE_SESSION_KEY,
        JSON.stringify({
          accountId: 'ACC-1',
          sessionId: 'SESS-1',
          role: 'customer',
          accessToken: 'tok',
          expiresAt: Infinity,
        }),
      );
      expect(await readSession(1000)).toBeNull();
      expect(memoryStore.has(SECURE_SESSION_KEY)).toBe(false);
    });
  });

  describe('Authentication core repository credential & registration rules', () => {
    it('authenticates seeded customer and rejects arbitrary wrong passwords or unknown accounts', async () => {
      const world = createTestWorld();

      // Valid customer credential
      const loginSuccess = await world.repository.login({
        identifier: '0912345678',
        password: 'customer-password-123',
      });
      expect(loginSuccess.ok).toBe(true);
      if (loginSuccess.ok) {
        expect(loginSuccess.value.role).toBe('customer');
        expect(loginSuccess.value.accountId).toBe('CUSTOMER-1');
      }

      // Arbitrary wrong password must fail
      const loginWrongPass = await world.repository.login({
        identifier: '0912345678',
        password: 'random-incorrect-password',
      });
      expect(loginWrongPass.ok).toBe(false);
      if (!loginWrongPass.ok) {
        expect(loginWrongPass.code).toBe('unauthorized');
      }

      // Unknown account identifier must fail
      const loginUnknown = await world.repository.login({
        identifier: '0999999999',
        password: 'customer-password-123',
      });
      expect(loginUnknown.ok).toBe(false);
      if (!loginUnknown.ok) {
        expect(loginUnknown.code).toBe('notFound');
      }
    });

    it('authenticates seeded driver and does NOT grant driver role from arbitrary substring', async () => {
      const world = createTestWorld();

      // Seeded driver login
      const driverLogin = await world.repository.login({
        identifier: 'driver01',
        password: 'driver-password-123',
      });
      expect(driverLogin.ok).toBe(true);
      if (driverLogin.ok) {
        expect(driverLogin.value.role).toBe('driver');
        expect(driverLogin.value.accountId).toBe('DRIVER-1');
      }

      // Customer account containing "driver" substring must NOT be treated as driver
      const fakeDriverLogin = await world.repository.login({
        identifier: 'user-with-driver-in-name',
        password: 'some-password',
      });
      expect(fakeDriverLogin.ok).toBe(false);
    });

    it('enforces registration >=8 chars, contact info, rejects duplicates, and registered account can login', async () => {
      const world = createTestWorld();

      // Password < 8 characters must fail validation
      const shortPassRes = await world.repository.register({
        fullName: 'Le Van B',
        phone: '0988111222',
        password: 'pass123', // 7 chars
      });
      expect(shortPassRes.ok).toBe(false);
      if (!shortPassRes.ok) {
        expect(shortPassRes.code).toBe('validation');
      }

      // Missing phone and email must fail validation
      const noContactRes = await world.repository.register({
        fullName: 'Le Van B',
        password: 'strong-password-123',
      });
      expect(noContactRes.ok).toBe(false);
      if (!noContactRes.ok) {
        expect(noContactRes.code).toBe('validation');
      }

      // Successful registration with >=8 chars and valid phone
      const registerRes = await world.repository.register({
        fullName: 'Nguyen Thi Cuc',
        phone: '0977889900',
        password: 'strong-password-123',
      });
      expect(registerRes.ok).toBe(true);
      if (registerRes.ok) {
        expect(registerRes.value.role).toBe('customer');
      }

      // Duplicate registration with same phone must be rejected with conflict
      const duplicateRes = await world.repository.register({
        fullName: 'Nguyen Thi Cuc Duplicate',
        phone: '0977889900',
        password: 'another-strong-password',
      });
      expect(duplicateRes.ok).toBe(false);
      if (!duplicateRes.ok) {
        expect(duplicateRes.code).toBe('conflict');
      }

      // The registered account must now be able to login with its credentials
      const loginRegistered = await world.repository.login({
        identifier: '0977889900',
        password: 'strong-password-123',
      });
      expect(loginRegistered.ok).toBe(true);
      if (loginRegistered.ok) {
        expect(loginRegistered.value.role).toBe('customer');
      }
    });

    it('generates non-colliding IDs and session IDs even under identical fixed clock', async () => {
      const world = createTestWorld();

      const reg1 = await world.repository.register({
        fullName: 'User One',
        phone: '0911000001',
        password: 'password-unique-1',
      });
      const reg2 = await world.repository.register({
        fullName: 'User Two',
        phone: '0911000002',
        password: 'password-unique-2',
      });

      expect(reg1.ok).toBe(true);
      expect(reg2.ok).toBe(true);
      if (reg1.ok && reg2.ok) {
        expect(reg1.value.accountId).not.toBe(reg2.value.accountId);
        expect(reg1.value.sessionId).not.toBe(reg2.value.sessionId);
      }
    });

    it('validates authentic session and rejects forged or expired sessions via repository authority', async () => {
      const sharedAuthStorage = createInMemoryMockAuthStorage();
      const world = createTestWorld({ authStorage: sharedAuthStorage });
      const loginRes = await world.repository.login({
        identifier: '0912345678',
        password: 'customer-password-123',
      });
      expect(loginRes.ok).toBe(true);
      if (!loginRes.ok) return;

      // Authentic session passes repository validation
      const validCheck = await world.repository.validateSession(loginRes.value);
      expect(validCheck.ok).toBe(true);
      if (validCheck.ok) {
        expect(validCheck.value.accountId).toBe('CUSTOMER-1');
        expect(validCheck.value.role).toBe('customer');
      }

      // Forged session credentials reject
      const forgedCheck = await world.repository.validateSession({
        ...loginRes.value,
        accessToken: 'forged-access-token',
      });
      expect(forgedCheck.ok).toBe(false);
      if (!forgedCheck.ok) {
        expect(forgedCheck.code).toBe('unauthorized');
      }

      // Recreating repository with same authority preserves active session
      const worldRecreated = createTestWorld({ authStorage: sharedAuthStorage });
      const recreatedCheck = await worldRecreated.repository.validateSession(loginRes.value);
      expect(recreatedCheck.ok).toBe(true);
    });

    it('persists registered accounts and validates sessions across fresh repository instances using durable auth storage without global memory', async () => {
      const backingAuthStore = new Map<string, string>();
      const fsAdapter = {
        async readFile(p: string): Promise<string | null> {
          return backingAuthStore.get(p) ?? null;
        },
        async writeFile(p: string, c: string): Promise<void> {
          backingAuthStore.set(p, c);
        },
        async moveFile(from: string, to: string): Promise<void> {
          const content = backingAuthStore.get(from) ?? '';
          backingAuthStore.set(to, content);
          backingAuthStore.delete(from);
        },
        async deleteFile(p: string): Promise<void> {
          backingAuthStore.delete(p);
        },
      };

      const authStorage1 = createFileJournalMockAuthStorage({
        filePath: 'mock-auth.json',
        fs: fsAdapter,
      });

      const repo1 = createMockRepository({
        now: () => 1000,
        seed: 'seed-isolated-1',
        authStorage: authStorage1,
      });
      await repo1.initialize();

      // 1. Register a new customer in repo1
      const regRes = await repo1.register({
        fullName: 'Nguyen Thi Ben',
        phone: '0933221100',
        password: 'secure-pass-1234',
      });
      expect(regRes.ok).toBe(true);
      if (!regRes.ok) return;

      // 2. Login as seeded driver in repo1
      const driverLoginRes = await repo1.login({
        identifier: 'driver01',
        password: 'driver-password-123',
      });
      expect(driverLoginRes.ok).toBe(true);
      if (!driverLoginRes.ok) return;

      // Now create a COMPLETELY NEW repository instance (simulating fresh process restart)
      const authStorage2 = createFileJournalMockAuthStorage({
        filePath: 'mock-auth.json',
        fs: fsAdapter,
      });

      const repo2 = createMockRepository({
        now: () => 1000,
        seed: 'seed-isolated-2',
        authStorage: authStorage2,
      });
      await repo2.initialize();

      // The registered account MUST be able to login in the fresh instance
      const loginRegisteredInRepo2 = await repo2.login({
        identifier: '0933221100',
        password: 'secure-pass-1234',
      });
      expect(loginRegisteredInRepo2.ok).toBe(true);
      if (loginRegisteredInRepo2.ok) {
        expect(loginRegisteredInRepo2.value.accountId).toBe(regRes.value.accountId);
      }

      // The active driver session from repo1 MUST validate in the fresh instance
      const validateDriverInRepo2 = await repo2.validateSession(driverLoginRes.value);
      expect(validateDriverInRepo2.ok).toBe(true);

      // A forged session MUST be rejected
      const validateForgedInRepo2 = await repo2.validateSession({
        ...driverLoginRes.value,
        accessToken: 'forged-token-value',
      });
      expect(validateForgedInRepo2.ok).toBe(false);

      // Verify that no plaintext accessToken exists in the persisted file
      const rawFile = backingAuthStore.get('mock-auth.json') ?? '';
      expect(rawFile).not.toContain(driverLoginRes.value.accessToken);
    });

    it('proves cold restore and registered account persistence across fresh module lifecycle (isolated module scope)', async () => {
      const backingAuthStore = new Map<string, string>();
      const fsAdapter = {
        async readFile(p: string): Promise<string | null> {
          return backingAuthStore.get(p) ?? null;
        },
        async writeFile(p: string, c: string): Promise<void> {
          backingAuthStore.set(p, c);
        },
        async moveFile(from: string, to: string): Promise<void> {
          const content = backingAuthStore.get(from) ?? '';
          backingAuthStore.set(to, content);
          backingAuthStore.delete(from);
        },
        async deleteFile(p: string): Promise<void> {
          backingAuthStore.delete(p);
        },
      };

      let initialLoginSession: import('../../domain/types').Session | null = null;
      let registeredAccountId: string | null = null;

      // Module Lifecycle 1
      await jest.isolateModulesAsync(async () => {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const storageMod =
          require('../../repositories/mock/mockAuthStorage') as typeof import('../../repositories/mock/mockAuthStorage');
        const repoMod =
          require('../../repositories/mock/createMockRepository') as typeof import('../../repositories/mock/createMockRepository');
        /* eslint-enable @typescript-eslint/no-require-imports */
        const createStorage = storageMod.createFileJournalMockAuthStorage;
        const createRepo = repoMod.createMockRepository;

        const storage = createStorage({ filePath: 'isolated-lifecycle.json', fs: fsAdapter });
        const repo = createRepo({ now: () => 2000, seed: 'isolated-seed-1', authStorage: storage });
        await repo.initialize();

        const reg = await repo.register({
          fullName: 'Tran Van Lifecycle',
          phone: '0944556677',
          password: 'password-lifecycle-123',
        });
        expect(reg.ok).toBe(true);
        if (reg.ok) registeredAccountId = reg.value.accountId;

        const login = await repo.login({
          identifier: '0912345678',
          password: 'customer-password-123',
        });
        expect(login.ok).toBe(true);
        if (login.ok) initialLoginSession = login.value;
      });

      expect(initialLoginSession).not.toBeNull();
      expect(registeredAccountId).not.toBeNull();

      // Module Lifecycle 2: completely fresh isolated module execution
      await jest.isolateModulesAsync(async () => {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const storageMod =
          require('../../repositories/mock/mockAuthStorage') as typeof import('../../repositories/mock/mockAuthStorage');
        const repoMod =
          require('../../repositories/mock/createMockRepository') as typeof import('../../repositories/mock/createMockRepository');
        /* eslint-enable @typescript-eslint/no-require-imports */
        const createStorage = storageMod.createFileJournalMockAuthStorage;
        const createRepo = repoMod.createMockRepository;

        const storage = createStorage({ filePath: 'isolated-lifecycle.json', fs: fsAdapter });
        const repo = createRepo({ now: () => 2000, seed: 'isolated-seed-2', authStorage: storage });
        await repo.initialize();

        // 1. Registered account logs in cleanly in fresh module
        const loginReg = await repo.login({
          identifier: '0944556677',
          password: 'password-lifecycle-123',
        });
        expect(loginReg.ok).toBe(true);
        if (loginReg.ok) {
          expect(loginReg.value.accountId).toBe(registeredAccountId);
        }

        // 2. Active session from prior lifecycle validates cleanly
        const val = await repo.validateSession(initialLoginSession!);
        expect(val.ok).toBe(true);
        if (val.ok) {
          expect(val.value.accountId).toBe('CUSTOMER-1');
        }

        // 3. Forged session fails
        const valForged = await repo.validateSession({
          ...initialLoginSession!,
          accessToken: 'tampered-token',
        });
        expect(valForged.ok).toBe(false);

        // 4. Persistence file contains no plaintext accessToken
        const rawFile = backingAuthStore.get('isolated-lifecycle.json') ?? '';
        expect(rawFile).not.toContain(initialLoginSession!.accessToken);
      });
    });

    describe('Standard SHA-256 vectors and fail-closed atomic persistence', () => {
      it('matches standard NIST/RFC SHA-256 test vectors without custom crypto', () => {
        // Vector 1: Empty string
        expect(sha256Hex('')).toBe(
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );

        // Vector 2: 'abc'
        expect(sha256Hex('abc')).toBe(
          'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );

        // Vector 3: 448-bit string
        expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
          '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
        );

        // Vector 4: Arbitrary string matches Node crypto reference
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeCrypto = require('crypto') as {
          createHash: (alg: string) => {
            update: (data: string) => { digest: (enc: string) => string };
          };
        };
        const sample = 'BlueBus-Auth-Token-Verification-Random-String-9876543210';
        expect(sha256Hex(sample)).toBe(
          nodeCrypto.createHash('sha256').update(sample).digest('hex'),
        );
      });

      it('enforces fail-closed behavior on corrupted or invalid auth snapshot data', async () => {
        const store = new Map<string, string>();
        const fsAdapter = {
          async readFile(p: string): Promise<string | null> {
            return store.get(p) ?? null;
          },
          async writeFile(p: string, c: string): Promise<void> {
            store.set(p, c);
          },
          async moveFile(from: string, to: string): Promise<void> {
            const data = store.get(from) ?? '';
            store.set(to, data);
            store.delete(from);
          },
          async deleteFile(p: string): Promise<void> {
            store.delete(p);
          },
        };

        const storage = createFileJournalMockAuthStorage({ filePath: 'auth.json', fs: fsAdapter });

        // Non-existent file loads as null (fail-closed)
        expect(await storage.load()).toBeNull();

        // Corrupted JSON returns null (fail-closed, no crash)
        store.set('auth.json', '{ corrupt-unparseable-json: ');
        expect(await storage.load()).toBeNull();

        // Invalid version returns null
        store.set('auth.json', JSON.stringify({ version: 99, accounts: [], sessions: [] }));
        expect(await storage.load()).toBeNull();

        // Invalid session shape (e.g. string expiresAt) returns null
        store.set(
          'auth.json',
          JSON.stringify({
            version: 1,
            accounts: [],
            sessions: [
              {
                sessionId: 's1',
                accountId: 'a1',
                role: 'customer',
                tokenHash: 'h',
                expiresAt: 'invalid',
              },
            ],
          }),
        );
        expect(await storage.load()).toBeNull();

        // Atomic write pattern: save writes to temp first then moves to target
        const trace: string[] = [];
        const tracingFs = {
          async readFile(p: string): Promise<string | null> {
            return store.get(p) ?? null;
          },
          async writeFile(p: string, c: string): Promise<void> {
            trace.push(`write:${p}`);
            store.set(p, c);
          },
          async moveFile(from: string, to: string): Promise<void> {
            trace.push(`move:${from}->${to}`);
            const data = store.get(from) ?? '';
            store.set(to, data);
            store.delete(from);
          },
          async deleteFile(p: string): Promise<void> {
            trace.push(`delete:${p}`);
            store.delete(p);
          },
        };

        const tracingStorage = createFileJournalMockAuthStorage({
          filePath: 'auth.json',
          fs: tracingFs,
        });
        await tracingStorage.save({ version: 1, accounts: [], sessions: [] });
        expect(trace).toEqual(['write:auth.json.tmp', 'move:auth.json.tmp->auth.json']);

        // clear() cleans up both primary and temp files
        trace.length = 0;
        await tracingStorage.clear();
        expect(trace).toEqual(['delete:auth.json', 'delete:auth.json.tmp']);
      });
    });
  });
});
