import {
  HOLD_DURATION_MS,
  type BookingDraft,
  type BookingReview,
  type CancellationQuote,
  type CheckInResult,
  type DriverAccount,
  type ManifestEntry,
  type MockOptions,
  type OperationKind,
  type OperationRecord,
  type Passenger,
  type PaymentAttempt,
  type Refund,
  type Result,
  type Role,
  type SearchInput,
  type Seat,
  type SeatHold,
  type Session,
  type Ticket,
  type Trip,
  type TripStatus,
} from '../../domain/types';
import type { AccountProfile, TravelRepository } from '../contracts/TravelRepository';
import { normalizeTicketCode, normalizeVietnamPhone } from '../../domain/lookup';
import { parseTicketQr } from '../../shared/native/cameraGateway';
import { sha256Hex, type MockSessionVerificationRecord } from './mockAuthStorage';
import {
  MOCK_STATE_SCHEMA_VERSION,
  parseMockStateSnapshot,
  type MockStateSnapshot,
} from './mockStateSchema';

interface MockAccountRecord {
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

const SEEDED_MOCK_ACCOUNTS: MockAccountRecord[] = [
  {
    accountId: 'DRIVER-HOANG-NAM',
    identifiers: ['b@gmail.com'],
    email: 'b@gmail.com',
    password: '12345678',
    passwordAliases: [],
    role: 'driver',
    fullName: 'Hoàng Nam',
  },
  {
    accountId: 'CUSTOMER-MINH-ANH',
    identifiers: ['a@gmail.com'],
    email: 'a@gmail.com',
    password: '12345678',
    passwordAliases: [],
    role: 'customer',
    fullName: 'Minh Anh',
  },
  {
    accountId: 'CUSTOMER-1',
    identifiers: ['0912345678', 'customer1'],
    password: 'customer-password-123',
    passwordAliases: ['correct-password'],
    role: 'customer',
    fullName: 'Nguyễn Minh Anh',
    phone: '0912345678',
  },
  {
    accountId: 'CUSTOMER-2',
    identifiers: ['0901234567', 'customer2'],
    password: 'customer2-password-123',
    passwordAliases: ['correct-password-2'],
    role: 'customer',
    fullName: 'Lê Thị Mai',
    phone: '0901234567',
  },
  {
    accountId: 'DRIVER-1',
    identifiers: ['driver01', '0988776655'],
    password: 'driver-password-123',
    passwordAliases: ['driver-password'],
    role: 'driver',
    fullName: 'Trần Văn Tài',
    phone: '0988776655',
  },
  {
    accountId: 'DRIVER-2',
    identifiers: ['driver02', '0988776656'],
    password: 'driver-password-123',
    passwordAliases: ['driver-password-2'],
    role: 'driver',
    fullName: 'Phạm Văn Hùng',
    phone: '0988776656',
  },
];

export function buildSeedSessions(nowMs: number): Map<string, Session> {
  const expiresAt = nowMs + 3600000;
  const seeded: Session[] = [
    {
      accountId: 'CUSTOMER-1',
      sessionId: 'SES-CUSTOMER-1',
      role: 'customer',
      accessToken: 'mock-token-customer-1',
      expiresAt,
    },
    {
      accountId: 'CUSTOMER-2',
      sessionId: 'SES-CUSTOMER-2',
      role: 'customer',
      accessToken: 'mock-token-customer-2',
      expiresAt,
    },
    {
      accountId: 'DRIVER-1',
      sessionId: 'SES-DRIVER-1',
      role: 'driver',
      accessToken: 'mock-token-driver-1',
      expiresAt,
    },
    {
      accountId: 'DRIVER-2',
      sessionId: 'SES-DRIVER-2',
      role: 'driver',
      accessToken: 'mock-token-driver-2',
      expiresAt,
    },
  ];
  return new Map(seeded.map((s) => [s.sessionId, s]));
}

export function buildSeedSnapshot(seed: string, nowMs: number): MockStateSnapshot {
  const trip: Trip = {
    id: 'TR-204',
    origin: 'TP. Hồ Chí Minh',
    destination: 'Lâm Đồng',
    departureAt: '2026-08-27T07:30:00+07:00',
    arrivalAt: '2026-08-27T13:45:00+07:00',
    fareVnd: 320000,
    status: 'scheduled',
    version: 1,
    pickupStops: [
      {
        id: 'STOP-PK-1',
        name: 'Bến xe Miền Đông Mới',
        address: '501 Hoàng Hữu Nam, TP. Thủ Đức, TP.HCM',
      },
      {
        id: 'STOP-PK-2',
        name: 'Văn phòng Quận 1',
        address: '272 Đề Thám, Quận 1, TP.HCM',
      },
    ],
    dropoffStops: [
      {
        id: 'STOP-DO-1',
        name: 'Bến xe Liên tỉnh Lâm Đồng',
        address: '01 Tô Hiến Thành, Phường 3, Lâm Đồng',
      },
    ],
  };

  const seats: Seat[] = [
    { id: 'A01', label: 'A01', state: 'booked' },
    { id: 'A02', label: 'A02', state: 'available' },
    { id: 'A03', label: 'A03', state: 'available' },
    { id: 'A04', label: 'A04', state: 'heldByOther' },
    { id: 'A05', label: 'A05', state: 'available' },
    { id: 'A06', label: 'A06', state: 'available' },
    { id: 'A07', label: 'A07', state: 'disabled' },
    { id: 'A08', label: 'A08', state: 'available' },
  ];

  const hold: SeatHold = {
    id: 'HOLD-204',
    tripId: trip.id,
    seatIds: ['A02'],
    expiresAt: nowMs + HOLD_DURATION_MS,
    version: 1,
  };

  const draft: BookingDraft = {
    id: 'DRAFT-204',
    guestSessionId: 'GUEST-SESSION-1',
    tripId: trip.id,
    seatIds: ['A02'],
    holdId: hold.id,
    holdVersion: hold.version,
    expiresAt: hold.expiresAt,
    version: 1,
    customerAccountId: 'CUSTOMER-1',
  };

  const review: BookingReview = {
    draftId: draft.id,
    passengers: [
      {
        seatId: 'A02',
        fullName: 'Nguyễn Minh Anh',
        phone: '0912345678',
      },
    ],
    totalVnd: trip.fareVnd,
    version: 1,
  };

  const ticket: Ticket = {
    id: 'TICKET-204-A01',
    bookingId: 'BOOKING-204',
    accountId: 'CUSTOMER-1',
    code: 'TK-A01',
    bookingPhone: '0912345678',
    tripId: trip.id,
    seatId: 'A01',
    status: 'issued',
    qrPayload: JSON.stringify({
      version: 1,
      ticketCode: 'TK-A01',
      signature: 'mock:TK-A01',
    }),
    fareVnd: trip.fareVnd,
  };

  const quote: CancellationQuote = {
    id: 'QUOTE-204',
    bookingId: ticket.bookingId,
    ticketIds: [ticket.id],
    refundVnd: 288000,
    feeVnd: 32000,
    version: 1,
  };

  const driverAccount: DriverAccount = {
    id: 'DRIVER-1',
    displayName: 'Trần Quốc Bảo',
    phone: '0987654321',
    email: 'driver1@bluecoach.vn',
  };

  const manifest: ManifestEntry[] = [
    {
      ticketId: ticket.id,
      passengerName: 'Nguyễn Minh Anh',
      seatId: ticket.seatId,
      pickupStopId: 'STOP-PK-1',
      checkedIn: false,
    },
  ];

  return {
    schemaVersion: MOCK_STATE_SCHEMA_VERSION,
    seed,
    updatedAt: nowMs,
    trips: [trip],
    seatsByTrip: {
      [trip.id]: seats,
    },
    holds: [hold],
    drafts: [draft],
    reviews: [review],
    tickets: [ticket],
    quotes: [quote],
    refunds: [],
    manifestsByTrip: {
      [trip.id]: manifest,
    },
    driverAccounts: [driverAccount],
    assignedTripsByDriver: {
      [driverAccount.id]: [trip.id],
    },
    operations: [],
  };
}

function notImplemented<T>(methodName: string): Result<T> {
  return {
    ok: false,
    code: 'notImplemented',
    message: `${methodName} is not implemented in Plan 01 Foundation`,
  };
}

function validateSessionInternal(
  session: Session,
  nowMs: number,
  sessionVerification: ReadonlyMap<string, MockSessionVerificationRecord>,
  expectedRole?: Role,
): Result<Session> {
  if (
    !session ||
    typeof session !== 'object' ||
    typeof session.accountId !== 'string' ||
    session.accountId.trim().length === 0 ||
    typeof session.sessionId !== 'string' ||
    session.sessionId.trim().length === 0 ||
    typeof session.accessToken !== 'string' ||
    session.accessToken.trim().length === 0 ||
    (session.role !== 'customer' && session.role !== 'driver') ||
    typeof session.expiresAt !== 'number' ||
    !Number.isFinite(session.expiresAt)
  ) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'Session is missing required or valid credentials',
    };
  }

  const record = sessionVerification.get(session.sessionId);
  if (
    !record ||
    record.accountId !== session.accountId ||
    record.role !== session.role ||
    record.tokenHash !== sha256Hex(session.accessToken)
  ) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'Session credentials do not match active session authority',
    };
  }

  const effectiveExpiresAt = Math.min(session.expiresAt, record.expiresAt);
  if (nowMs >= effectiveExpiresAt) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'Session has expired',
    };
  }

  if (expectedRole && record.role !== expectedRole) {
    return {
      ok: false,
      code: 'forbidden',
      message: `Role "${record.role}" is not permitted for "${expectedRole}" operation`,
    };
  }

  return { ok: true, value: session };
}

export function createMockRepository(options: MockOptions): TravelRepository {
  const { now, seed, storage, authStorage } = options;
  let state: MockStateSnapshot = buildSeedSnapshot(seed, now());

  const sessionVerification = new Map<string, MockSessionVerificationRecord>();
  function initSeedVerification(currentTime: number): void {
    sessionVerification.clear();
    for (const s of buildSeedSessions(currentTime).values()) {
      sessionVerification.set(s.sessionId, {
        sessionId: s.sessionId,
        accountId: s.accountId,
        role: s.role,
        tokenHash: sha256Hex(s.accessToken),
        expiresAt: s.expiresAt,
      });
    }
  }
  initSeedVerification(now());

  let accounts: MockAccountRecord[] = structuredClone(SEEDED_MOCK_ACCOUNTS);
  let accountCounter = 0;
  let sessionCounter = 0;
  let initPromise: Promise<Result<void>> | null = null;
  let initInFlight: Promise<Result<void>> | null = null;

  async function persistAuth(): Promise<void> {
    if (!authStorage) return;

    await authStorage.save({
      version: 1,
      accounts,
      sessions: Array.from(sessionVerification.values()),
    });
  }

  async function runInitialize(): Promise<Result<void>> {
    const currentNow = now();
    initSeedVerification(currentNow);
    accounts = structuredClone(SEEDED_MOCK_ACCOUNTS);

    if (authStorage) {
      try {
        const authSnap = await authStorage.load();
        if (authSnap) {
          for (const acc of authSnap.accounts) {
            const index = accounts.findIndex((a) => a.accountId === acc.accountId);
            if (index < 0) accounts.push(acc);
            else accounts[index] = acc;
          }
          for (const s of authSnap.sessions) {
            sessionVerification.set(s.sessionId, s);
          }
        } else {
          await persistAuth();
        }
      } catch {
        // Fall back to seed state on storage error
      }
    }

    if (!storage) {
      state = buildSeedSnapshot(seed, currentNow);
      return { ok: true, value: undefined };
    }

    try {
      const raw = await storage.load();
      if (raw === null || raw === undefined) {
        const freshSeed = buildSeedSnapshot(seed, currentNow);
        await storage.save(freshSeed);
        state = freshSeed;
        return { ok: true, value: undefined };
      }

      const parsed = parseMockStateSnapshot(raw);
      if (!parsed.ok) {
        const freshSeed = buildSeedSnapshot(seed, currentNow);
        await storage.save(freshSeed);
        state = freshSeed;
        return {
          ok: false,
          code: parsed.code,
          message: parsed.message,
        };
      }

      state = parsed.value;
      return { ok: true, value: undefined };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const freshSeed = buildSeedSnapshot(seed, currentNow);
      state = freshSeed;
      try {
        await storage.save(freshSeed);
      } catch (saveError) {
        const saveReason = saveError instanceof Error ? saveError.message : String(saveError);
        return {
          ok: false,
          code: 'unknown',
          message: `demo-state-reset: ${reason} (recovery save failed: ${saveReason})`,
        };
      }
      return {
        ok: false,
        code: 'validation',
        message: reason.includes('demo-state-reset') ? reason : `demo-state-reset: ${reason}`,
      };
    }
  }

  function startInitialize(): Promise<Result<void>> {
    if (initInFlight) {
      return initInFlight;
    }
    const promise = runInitialize().finally(() => {
      initInFlight = null;
    });
    initInFlight = promise;
    initPromise = promise;
    return promise;
  }

  async function ensureInitialized(): Promise<Result<void>> {
    if (!initPromise) {
      return startInitialize();
    }
    return initPromise;
  }

  return {
    kind: 'mock',
    async getAccountProfile(session: Session): Promise<Result<AccountProfile>> {
      const init = await ensureInitialized();
      if (!init.ok) return init;
      const auth = validateSessionInternal(session, now(), sessionVerification);
      if (!auth.ok) return auth;
      const account = accounts.find((a) => a.accountId === session.accountId);
      if (!account) return { ok: false, code: 'notFound', message: 'Không tìm thấy tài khoản' };
      const { accountId, fullName, email, phone, avatarUri, dateOfBirth } = account;
      return {
        ok: true,
        value: {
          accountId,
          fullName,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(avatarUri ? { avatarUri } : {}),
          ...(dateOfBirth ? { dateOfBirth } : {}),
        },
      };
    },
    async updateAccountProfile(session, input) {
      const profile = await this.getAccountProfile(session);
      if (!profile.ok) return profile;
      const index = accounts.findIndex((a) => a.accountId === session.accountId);
      const account = accounts[index];
      if (!account) return { ok: false, code: 'notFound', message: 'Không tìm thấy tài khoản' };
      if (
        account.role === 'driver' &&
        ((input.phone !== undefined && input.phone !== (account.phone ?? '')) ||
          (input.dateOfBirth !== undefined && input.dateOfBirth !== (account.dateOfBirth ?? '')))
      )
        return {
          ok: false,
          code: 'forbidden',
          message: 'Tài xế không được thay đổi số điện thoại hoặc ngày sinh.',
        };
      const email = input.email === undefined ? account.email : input.email.trim().toLowerCase();
      const rawPhone = input.phone === undefined ? account.phone : input.phone.trim();
      const normalizedPhone = rawPhone ? normalizeVietnamPhone(rawPhone) : null;
      const phone = normalizedPhone?.ok ? normalizedPhone.value : rawPhone;
      const dateOfBirth =
        input.dateOfBirth === undefined ? account.dateOfBirth : input.dateOfBirth.trim();
      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, code: 'validation', message: 'Email không hợp lệ.' };
      if (phone && !/^(0[35789]\d{8}|\+84[35789]\d{8})$/.test(phone))
        return { ok: false, code: 'validation', message: 'Số điện thoại không hợp lệ.' };
      if (dateOfBirth) {
        const date = new Date(dateOfBirth + 'T00:00:00Z');
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== dateOfBirth ||
          date.getTime() > now() ||
          date.getUTCFullYear() < 1900
        )
          return {
            ok: false,
            code: 'validation',
            message: 'Ngày sinh không hợp lệ. Dùng định dạng YYYY-MM-DD.',
          };
      }
      if (
        accounts.some(
          (a, i) =>
            i !== index &&
            ((email && (a.email === email || a.identifiers.includes(email))) ||
              (phone && (a.phone === phone || a.identifiers.includes(phone)))),
        )
      )
        return {
          ok: false,
          code: 'conflict',
          message: 'Email hoặc số điện thoại đã được sử dụng.',
        };
      const identifiers = account.identifiers.filter(
        (id) => id !== account.email && id !== account.phone,
      );
      accounts[index] = {
        ...account,
        email,
        phone,
        dateOfBirth,
        identifiers: [
          ...new Set([...identifiers, ...(email ? [email] : []), ...(phone ? [phone] : [])]),
        ],
      };
      try {
        await persistAuth();
      } catch {
        accounts[index] = account;
        return {
          ok: false,
          code: 'unknown',
          message: 'Không lưu được thông tin. Vui lòng thử lại.',
        };
      }
      return this.getAccountProfile(session);
    },
    async updateAccountAvatar(
      session: Session,
      avatarUri: string,
    ): Promise<Result<AccountProfile>> {
      const profile = await this.getAccountProfile(session);
      if (!profile.ok) return profile;
      if (!avatarUri.startsWith('file://'))
        return { ok: false, code: 'validation', message: 'Ảnh đại diện không hợp lệ' };
      const index = accounts.findIndex((a) => a.accountId === session.accountId);
      const account = accounts[index];
      if (!account) return { ok: false, code: 'notFound', message: 'Không tìm thấy tài khoản' };
      accounts[index] = { ...account, avatarUri };
      try {
        await persistAuth();
      } catch {
        accounts[index] = account;
        return { ok: false, code: 'unknown', message: 'Không lưu được ảnh. Vui lòng thử lại.' };
      }
      return this.getAccountProfile(session);
    },
    async changePassword(
      session: Session,
      currentPassword: string,
      newPassword: string,
    ): Promise<Result<void>> {
      const profile = await this.getAccountProfile(session);
      if (!profile.ok) return profile;
      const index = accounts.findIndex((a) => a.accountId === session.accountId);
      const account = accounts[index];
      if (!account) return { ok: false, code: 'notFound', message: 'Không tìm thấy tài khoản' };
      if (
        account.password !== currentPassword &&
        !account.passwordAliases.includes(currentPassword)
      )
        return { ok: false, code: 'validation', message: 'Mật khẩu hiện tại không chính xác' };
      if (newPassword.length < 8 || !newPassword.trim())
        return { ok: false, code: 'validation', message: 'Mật khẩu mới cần ít nhất 8 ký tự' };
      if (newPassword === currentPassword)
        return {
          ok: false,
          code: 'validation',
          message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
        };
      accounts[index] = { ...account, password: newPassword, passwordAliases: [] };
      try {
        await persistAuth();
      } catch {
        accounts[index] = account;
        return {
          ok: false,
          code: 'unknown',
          message: 'Không lưu được mật khẩu. Vui lòng thử lại.',
        };
      }
      return { ok: true, value: undefined };
    },

    async initialize(): Promise<Result<void>> {
      return startInitialize();
    },

    async login(input: { identifier: string; password: string }): Promise<Result<Session>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      if (!input || !input.identifier || !input.identifier.trim() || !input.password) {
        return {
          ok: false,
          code: 'validation',
          message: 'Tài khoản và mật khẩu không được để trống',
        };
      }

      const rawId = input.identifier.trim();
      const idLower = rawId.toLowerCase();
      const phoneNorm = normalizeVietnamPhone(rawId);

      const account = accounts.find((acc) => {
        if (acc.accountId.toLowerCase() === idLower) return true;
        if (acc.identifiers.some((id) => id.toLowerCase() === idLower)) return true;
        if (phoneNorm.ok && acc.phone && acc.phone === phoneNorm.value) return true;
        if (acc.email && acc.email.toLowerCase() === idLower) return true;
        return false;
      });

      if (!account) {
        return {
          ok: false,
          code: 'notFound',
          message: 'Tài khoản không tồn tại',
        };
      }

      const passwordMatches =
        input.password === account.password || account.passwordAliases.includes(input.password);

      if (!passwordMatches) {
        return {
          ok: false,
          code: 'unauthorized',
          message: 'Mật khẩu không chính xác',
        };
      }

      sessionCounter += 1;
      const currentTime = now();
      const session: Session = {
        accountId: account.accountId,
        sessionId: `SES-${account.role.toUpperCase()}-${currentTime}-${sessionCounter}`,
        role: account.role,
        accessToken: `tok-${account.role}-${currentTime}-${sessionCounter}`,
        expiresAt: currentTime + 86400000,
      };

      sessionVerification.set(session.sessionId, {
        sessionId: session.sessionId,
        accountId: session.accountId,
        role: session.role,
        tokenHash: sha256Hex(session.accessToken),
        expiresAt: session.expiresAt,
      });
      await persistAuth();
      return { ok: true, value: structuredClone(session) };
    },

    async register(input: {
      fullName: string;
      phone?: string;
      email?: string;
      password: string;
    }): Promise<Result<Session>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      if (!input || !input.fullName || !input.fullName.trim()) {
        return {
          ok: false,
          code: 'validation',
          message: 'Họ và tên không được để trống',
        };
      }
      if (!input.password || input.password.length < 8) {
        return {
          ok: false,
          code: 'validation',
          message: 'Mật khẩu phải có ít nhất 8 ký tự',
        };
      }

      const hasPhone = Boolean(input.phone && input.phone.trim().length > 0);
      const hasEmail = Boolean(input.email && input.email.trim().length > 0);

      if (!hasPhone && !hasEmail) {
        return {
          ok: false,
          code: 'validation',
          message: 'Vui lòng cung cấp số điện thoại hoặc email hợp lệ',
        };
      }

      let normPhone: string | undefined;
      if (hasPhone) {
        const phoneRes = normalizeVietnamPhone(input.phone!);
        if (!phoneRes.ok) {
          return phoneRes;
        }
        normPhone = phoneRes.value;
      }

      let normEmail: string | undefined;
      if (hasEmail) {
        const emailTrimmed = input.email!.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrimmed)) {
          return {
            ok: false,
            code: 'validation',
            message: 'Email không đúng định dạng',
          };
        }
        normEmail = emailTrimmed;
      }

      // Check duplicates against all registered and seeded accounts
      const duplicate = accounts.find((acc) => {
        if (normPhone && (acc.phone === normPhone || acc.identifiers.includes(normPhone))) {
          return true;
        }
        if (
          normEmail &&
          (acc.email?.toLowerCase() === normEmail ||
            acc.identifiers.map((i) => i.toLowerCase()).includes(normEmail))
        ) {
          return true;
        }
        return false;
      });

      if (duplicate) {
        return {
          ok: false,
          code: 'conflict',
          message: 'Số điện thoại hoặc email đã được đăng ký',
        };
      }

      accountCounter += 1;
      const currentTime = now();
      const accountId = `CUSTOMER-REG-${currentTime}-${accountCounter}`;
      const identifiers: string[] = [];
      if (normPhone) identifiers.push(normPhone);
      if (normEmail) identifiers.push(normEmail);

      const newAccount: MockAccountRecord = {
        accountId,
        identifiers,
        password: input.password,
        passwordAliases: [],
        role: 'customer',
        fullName: input.fullName.trim(),
        phone: normPhone,
        email: normEmail,
      };

      accounts.push(newAccount);

      sessionCounter += 1;
      const session: Session = {
        accountId,
        sessionId: `SES-CUSTOMER-${currentTime}-${sessionCounter}`,
        role: 'customer',
        accessToken: `tok-customer-${currentTime}-${sessionCounter}`,
        expiresAt: currentTime + 86400000,
      };

      sessionVerification.set(session.sessionId, {
        sessionId: session.sessionId,
        accountId: session.accountId,
        role: session.role,
        tokenHash: sha256Hex(session.accessToken),
        expiresAt: session.expiresAt,
      });
      await persistAuth();
      return { ok: true, value: structuredClone(session) };
    },

    async logout(session: Session): Promise<void> {
      await ensureInitialized();
      if (session && typeof session.sessionId === 'string') {
        const current = sessionVerification.get(session.sessionId);
        if (
          current &&
          current.accountId === session.accountId &&
          current.tokenHash === sha256Hex(session.accessToken)
        ) {
          sessionVerification.delete(session.sessionId);
          await persistAuth();
        }
      }
    },

    async validateSession(session: Session): Promise<Result<Session>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return validateSessionInternal(session, now(), sessionVerification);
    },

    async search(_input: SearchInput): Promise<Result<Trip[]>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('search');
    },

    async getTrip(tripId: string): Promise<Result<Trip>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const found = state.trips.find((t) => t.id === tripId);
      if (!found) {
        return { ok: false, code: 'notFound', message: `Trip "${tripId}" not found` };
      }
      return { ok: true, value: structuredClone(found) };
    },

    async getSeats(tripId: string): Promise<Result<Seat[]>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const seats = state.seatsByTrip[tripId];
      if (!seats) {
        return { ok: false, code: 'notFound', message: `Seats for trip "${tripId}" not found` };
      }
      return { ok: true, value: structuredClone(seats) };
    },

    async holdSeats(_input: {
      tripId: string;
      seatIds: string[];
      guestSessionId: string;
      idempotencyKey: string;
    }): Promise<Result<SeatHold>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('holdSeats');
    },

    async replaceHold(_input: {
      holdId: string;
      seatIds: string[];
      version: number;
      guestSessionId: string;
      idempotencyKey: string;
    }): Promise<Result<SeatHold>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('replaceHold');
    },

    async releaseHold(_input: { holdId: string; guestSessionId: string }): Promise<Result<void>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('releaseHold');
    },

    async revalidateHold(input: { holdId: string; version: number }): Promise<Result<SeatHold>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const hold = state.holds.find((h) => h.id === input.holdId);
      if (!hold) {
        return { ok: false, code: 'notFound', message: `Hold "${input.holdId}" not found` };
      }
      if (now() >= hold.expiresAt) {
        return { ok: false, code: 'expired', message: `Hold "${input.holdId}" has expired` };
      }
      if (hold.version !== input.version) {
        return {
          ok: false,
          code: 'conflict',
          message: `Hold "${input.holdId}" version mismatch`,
        };
      }
      return { ok: true, value: structuredClone(hold) };
    },

    async createBookingDraft(_input: {
      holdId: string;
      guestSessionId: string;
      idempotencyKey: string;
    }): Promise<Result<BookingDraft>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('createBookingDraft');
    },

    async claimBookingDraft(_input: {
      draftId: string;
      guestSessionId: string;
      holdVersion: number;
      session: Session;
    }): Promise<Result<BookingDraft>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('claimBookingDraft');
    },

    async savePassengers(_input: {
      draftId: string;
      passengers: Passenger[];
      session: Session;
    }): Promise<Result<BookingReview>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('savePassengers');
    },

    async getBookingReview(draftId: string, session: Session): Promise<Result<BookingReview>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'customer');
      if (!auth.ok) {
        return auth;
      }
      const draft = state.drafts.find((d) => d.id === draftId);
      if (!draft) {
        return { ok: false, code: 'notFound', message: `Draft "${draftId}" not found` };
      }
      if (draft.customerAccountId && draft.customerAccountId !== auth.value.accountId) {
        return { ok: false, code: 'forbidden', message: 'Draft belongs to another customer' };
      }
      const review = state.reviews.find((r) => r.draftId === draftId);
      if (!review) {
        return { ok: false, code: 'notFound', message: `Review for draft "${draftId}" not found` };
      }
      return { ok: true, value: structuredClone(review) };
    },

    async createPayment(_input: {
      draftId: string;
      session: Session;
      idempotencyKey: string;
    }): Promise<Result<PaymentAttempt>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('createPayment');
    },

    async getPayment(_attemptId: string, _session: Session): Promise<Result<PaymentAttempt>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('getPayment');
    },

    async getTickets(session: Session): Promise<Result<Ticket[]>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'customer');
      if (!auth.ok) {
        return auth;
      }
      const owned = state.tickets.filter((t) => t.accountId === auth.value.accountId);
      return { ok: true, value: structuredClone(owned) };
    },

    async getTicket(ticketId: string, session: Session): Promise<Result<Ticket>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'customer');
      if (!auth.ok) {
        return auth;
      }
      const found = state.tickets.find((t) => t.id === ticketId);
      if (!found) {
        return { ok: false, code: 'notFound', message: `Ticket "${ticketId}" not found` };
      }
      if (found.accountId !== auth.value.accountId) {
        return {
          ok: false,
          code: 'forbidden',
          message: `Ticket "${ticketId}" does not belong to account "${auth.value.accountId}"`,
        };
      }
      return { ok: true, value: structuredClone(found) };
    },

    async lookupTicket(
      input: { code: string; phone: string } | { qrPayload: string },
    ): Promise<Result<Ticket>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }

      if ('qrPayload' in input && typeof input.qrPayload === 'string') {
        const parsed = parseTicketQr(input.qrPayload);
        if (!parsed.ok) {
          return parsed;
        }
        const found = state.tickets.find(
          (t) => normalizeTicketCode(t.code) === parsed.value.ticketCode,
        );
        if (!found) {
          return {
            ok: false,
            code: 'notFound',
            message: 'Không tìm thấy thông tin vé từ mã QR',
          };
        }
        return { ok: true, value: structuredClone(found) };
      }

      if ('code' in input && 'phone' in input) {
        const cleanCode = normalizeTicketCode(input.code);
        const cleanPhoneRes = normalizeVietnamPhone(input.phone);
        if (!cleanPhoneRes.ok) {
          return cleanPhoneRes;
        }

        const found = state.tickets.find(
          (t) =>
            normalizeTicketCode(t.code) === cleanCode && t.bookingPhone === cleanPhoneRes.value,
        );
        if (!found) {
          return {
            ok: false,
            code: 'notFound',
            message: 'Không tìm thấy thông tin vé hoặc số điện thoại không khớp',
          };
        }
        return { ok: true, value: structuredClone(found) };
      }

      return {
        ok: false,
        code: 'validation',
        message: 'Yêu cầu mã vé và số điện thoại hoặc mã QR hợp lệ',
      };
    },

    async quoteCancellation(_input: {
      ticketIds: string[];
      session: Session;
    }): Promise<Result<CancellationQuote>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('quoteCancellation');
    },

    async cancelTickets(_input: {
      quoteId: string;
      version: number;
      session: Session;
      idempotencyKey: string;
    }): Promise<Result<Refund>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('cancelTickets');
    },

    async getRefund(_refundId: string, _session: Session): Promise<Result<Refund>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('getRefund');
    },

    async getAssignedTrips(session: Session): Promise<Result<Trip[]>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'driver');
      if (!auth.ok) {
        return auth;
      }
      const assignedIds = state.assignedTripsByDriver[auth.value.accountId] ?? [];
      const trips = state.trips.filter((t) => assignedIds.includes(t.id));
      return { ok: true, value: structuredClone(trips) };
    },

    async getAssignedTrip(tripId: string, session: Session): Promise<Result<Trip>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'driver');
      if (!auth.ok) {
        return auth;
      }
      const assignedIds = state.assignedTripsByDriver[auth.value.accountId] ?? [];
      if (!assignedIds.includes(tripId)) {
        return {
          ok: false,
          code: 'forbidden',
          message: `Trip "${tripId}" is not assigned to driver "${auth.value.accountId}"`,
        };
      }
      const found = state.trips.find((t) => t.id === tripId);
      if (!found) {
        return { ok: false, code: 'notFound', message: `Trip "${tripId}" not found` };
      }
      return { ok: true, value: structuredClone(found) };
    },

    async getDriverAccount(session: Session): Promise<Result<DriverAccount>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'driver');
      if (!auth.ok) {
        return auth;
      }
      const found = state.driverAccounts.find((d) => d.id === auth.value.accountId);
      if (!found) {
        return {
          ok: false,
          code: 'notFound',
          message: `Driver account "${auth.value.accountId}" not found`,
        };
      }
      return { ok: true, value: structuredClone(found) };
    },

    async getManifest(tripId: string, session: Session): Promise<Result<ManifestEntry[]>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      const auth = validateSessionInternal(session, now(), sessionVerification, 'driver');
      if (!auth.ok) {
        return auth;
      }
      const assignedIds = state.assignedTripsByDriver[auth.value.accountId] ?? [];
      if (!assignedIds.includes(tripId)) {
        return {
          ok: false,
          code: 'forbidden',
          message: `Manifest for trip "${tripId}" is not assigned to driver "${auth.value.accountId}"`,
        };
      }
      const entries = state.manifestsByTrip[tripId] ?? [];
      return { ok: true, value: structuredClone(entries) };
    },

    async checkIn(_input: {
      tripId: string;
      qrPayload?: string;
      ticketCode?: string;
      session: Session;
      idempotencyKey: string;
    }): Promise<Result<CheckInResult>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('checkIn');
    },

    async getCheckIn(_attemptId: string, _session: Session): Promise<Result<CheckInResult>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('getCheckIn');
    },

    async transitionTrip(_input: {
      tripId: string;
      to: TripStatus;
      version: number;
      session: Session;
      idempotencyKey: string;
    }): Promise<Result<Trip>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('transitionTrip');
    },

    async getOperation(_input: {
      kind: OperationKind;
      idempotencyKey: string;
      session: Session;
    }): Promise<Result<OperationRecord>> {
      const init = await ensureInitialized();
      if (!init.ok) {
        return init;
      }
      return notImplemented('getOperation');
    },
  };
}
