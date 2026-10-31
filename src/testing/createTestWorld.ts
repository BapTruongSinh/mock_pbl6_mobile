import type {
  BookingDraft,
  CancellationQuote,
  Result,
  SeatHold,
  Session,
  Ticket,
  Trip,
} from '../domain/types';
import type { TravelRepository } from '../repositories/contracts/TravelRepository';
import { buildSeedSnapshot, createMockRepository } from '../repositories/mock/createMockRepository';
import { createInMemoryMockStateStorage } from '../repositories/mock/mockStateStorage';
import {
  createInMemoryMockAuthStorage,
  type MockAuthStorage,
} from '../repositories/mock/mockAuthStorage';
import type { MockStateStorage } from '../domain/types';

export type MutationName = 'createPayment' | 'cancelTickets' | 'checkIn' | 'transitionTrip';

export type FaultMode = 'timeoutAfterCommit' | 'networkBeforeCommit';

export interface TestWorld {
  repository: TravelRepository;
  clock: {
    now(): number;
    advanceBy(ms: number): void;
  };
  sessions: {
    customer: Session;
    otherCustomer: Session;
    driver: Session;
  };
  fixtures: {
    trip: Trip;
    hold: SeatHold;
    draft: BookingDraft;
    ticket: Ticket;
    quote: CancellationQuote;
  };
  faults: {
    once(operation: MutationName, mode: FaultMode): void;
  };
  calls: {
    count(operation: string): number;
  };
}

export const DEFAULT_TEST_WORLD_NOW = Date.parse('2026-08-27T00:00:00+07:00');

export function createTestWorld(options?: {
  now?: number;
  caseId?: string;
  storage?: MockStateStorage;
  authStorage?: MockAuthStorage;
}): TestWorld {
  let currentNow = options?.now ?? DEFAULT_TEST_WORLD_NOW;
  const seed = options?.caseId ?? 'default-test-world';
  const storage = options?.storage ?? createInMemoryMockStateStorage();
  const authStorage = options?.authStorage ?? createInMemoryMockAuthStorage();
  const baseRepo = createMockRepository({
    now: () => currentNow,
    seed,
    storage,
    authStorage,
  });

  const snapshot = buildSeedSnapshot(seed, currentNow);
  const callCounts = new Map<string, number>();
  const pendingFaults = new Map<MutationName, FaultMode>();

  function recordCall(operation: string): void {
    callCounts.set(operation, (callCounts.get(operation) ?? 0) + 1);
  }

  function consumeFault(operation: MutationName): FaultMode | undefined {
    const mode = pendingFaults.get(operation);
    if (mode) {
      pendingFaults.delete(operation);
    }
    return mode;
  }

  const repository: TravelRepository = {
    kind: baseRepo.kind,
    getAccountProfile: (session) => baseRepo.getAccountProfile(session),
    updateAccountProfile: (session, input) => baseRepo.updateAccountProfile(session, input),
    updateAccountAvatar: (session, uri) => baseRepo.updateAccountAvatar(session, uri),
    changePassword: (session, current, next) => baseRepo.changePassword(session, current, next),

    async initialize() {
      recordCall('initialize');
      return baseRepo.initialize();
    },

    async login(input) {
      recordCall('login');
      return baseRepo.login(input);
    },

    async register(input) {
      recordCall('register');
      return baseRepo.register(input);
    },

    async logout(session) {
      recordCall('logout');
      return baseRepo.logout(session);
    },

    async validateSession(session) {
      recordCall('validateSession');
      return baseRepo.validateSession(session);
    },

    async search(input) {
      recordCall('search');
      return baseRepo.search(input);
    },

    async getTrip(tripId) {
      recordCall('getTrip');
      return baseRepo.getTrip(tripId);
    },

    async getSeats(tripId) {
      recordCall('getSeats');
      return baseRepo.getSeats(tripId);
    },

    async holdSeats(input) {
      recordCall('holdSeats');
      return baseRepo.holdSeats(input);
    },

    async replaceHold(input) {
      recordCall('replaceHold');
      return baseRepo.replaceHold(input);
    },

    async releaseHold(input) {
      recordCall('releaseHold');
      return baseRepo.releaseHold(input);
    },

    async revalidateHold(input) {
      recordCall('revalidateHold');
      return baseRepo.revalidateHold(input);
    },

    async createBookingDraft(input) {
      recordCall('createBookingDraft');
      return baseRepo.createBookingDraft(input);
    },

    async claimBookingDraft(input) {
      recordCall('claimBookingDraft');
      return baseRepo.claimBookingDraft(input);
    },

    async savePassengers(input) {
      recordCall('savePassengers');
      return baseRepo.savePassengers(input);
    },

    async getBookingReview(draftId, session) {
      recordCall('getBookingReview');
      return baseRepo.getBookingReview(draftId, session);
    },

    async createPayment(input): Promise<Result<import('../domain/types').PaymentAttempt>> {
      recordCall('createPayment');
      const fault = consumeFault('createPayment');
      if (fault === 'networkBeforeCommit') {
        return { ok: false, code: 'network', message: 'Injected network fault before commit' };
      }
      const res = await baseRepo.createPayment(input);
      if (fault === 'timeoutAfterCommit') {
        return { ok: false, code: 'unknown', message: 'Injected timeout after commit' };
      }
      return res;
    },

    async getPayment(attemptId, session) {
      recordCall('getPayment');
      return baseRepo.getPayment(attemptId, session);
    },

    async getTickets(session) {
      recordCall('getTickets');
      return baseRepo.getTickets(session);
    },

    async getTicket(ticketId, session) {
      recordCall('getTicket');
      return baseRepo.getTicket(ticketId, session);
    },

    async lookupTicket(input) {
      recordCall('lookupTicket');
      return baseRepo.lookupTicket(input);
    },

    async quoteCancellation(input) {
      recordCall('quoteCancellation');
      return baseRepo.quoteCancellation(input);
    },

    async cancelTickets(input) {
      recordCall('cancelTickets');
      const fault = consumeFault('cancelTickets');
      if (fault === 'networkBeforeCommit') {
        return { ok: false, code: 'network', message: 'Injected network fault before commit' };
      }
      const res = await baseRepo.cancelTickets(input);
      if (fault === 'timeoutAfterCommit') {
        return { ok: false, code: 'unknown', message: 'Injected timeout after commit' };
      }
      return res;
    },

    async getRefund(refundId, session) {
      recordCall('getRefund');
      return baseRepo.getRefund(refundId, session);
    },

    async getAssignedTrips(session) {
      recordCall('getAssignedTrips');
      return baseRepo.getAssignedTrips(session);
    },

    async getAssignedTrip(tripId, session) {
      recordCall('getAssignedTrip');
      return baseRepo.getAssignedTrip(tripId, session);
    },

    async getDriverAccount(session) {
      recordCall('getDriverAccount');
      return baseRepo.getDriverAccount(session);
    },

    async getManifest(tripId, session) {
      recordCall('getManifest');
      return baseRepo.getManifest(tripId, session);
    },

    async checkIn(input) {
      recordCall('checkIn');
      const fault = consumeFault('checkIn');
      if (fault === 'networkBeforeCommit') {
        return { ok: false, code: 'network', message: 'Injected network fault before commit' };
      }
      const res = await baseRepo.checkIn(input);
      if (fault === 'timeoutAfterCommit') {
        return { ok: false, code: 'unknown', message: 'Injected timeout after commit' };
      }
      return res;
    },

    async getCheckIn(attemptId, session) {
      recordCall('getCheckIn');
      return baseRepo.getCheckIn(attemptId, session);
    },

    async transitionTrip(input) {
      recordCall('transitionTrip');
      const fault = consumeFault('transitionTrip');
      if (fault === 'networkBeforeCommit') {
        return { ok: false, code: 'network', message: 'Injected network fault before commit' };
      }
      const res = await baseRepo.transitionTrip(input);
      if (fault === 'timeoutAfterCommit') {
        return { ok: false, code: 'unknown', message: 'Injected timeout after commit' };
      }
      return res;
    },

    async getOperation(input) {
      recordCall('getOperation');
      return baseRepo.getOperation(input);
    },
  };

  const sessionExpiry = currentNow + 3600000;
  const sessions = {
    customer: {
      accountId: 'CUSTOMER-1',
      sessionId: 'SES-CUSTOMER-1',
      role: 'customer' as const,
      accessToken: 'mock-token-customer-1',
      expiresAt: sessionExpiry,
    },
    otherCustomer: {
      accountId: 'CUSTOMER-2',
      sessionId: 'SES-CUSTOMER-2',
      role: 'customer' as const,
      accessToken: 'mock-token-customer-2',
      expiresAt: sessionExpiry,
    },
    driver: {
      accountId: 'DRIVER-1',
      sessionId: 'SES-DRIVER-1',
      role: 'driver' as const,
      accessToken: 'mock-token-driver-1',
      expiresAt: sessionExpiry,
    },
  };

  const trip = snapshot.trips[0];
  const hold = snapshot.holds[0];
  const draft = snapshot.drafts[0];
  const ticket = snapshot.tickets[0];
  const quote = snapshot.quotes[0];

  if (!trip || !hold || !draft || !ticket || !quote) {
    throw new Error('Failed to build canonical TestWorld seed fixtures');
  }

  return {
    repository,
    clock: {
      now: () => currentNow,
      advanceBy: (ms: number) => {
        if (!Number.isFinite(ms) || ms < 0) {
          throw new Error('advanceBy requires a non-negative finite millisecond value');
        }
        currentNow += ms;
      },
    },
    sessions,
    fixtures: {
      trip,
      hold,
      draft,
      ticket,
      quote,
    },
    faults: {
      once: (operation: MutationName, mode: FaultMode) => {
        pendingFaults.set(operation, mode);
      },
    },
    calls: {
      count: (operation: string) => callCounts.get(operation) ?? 0,
    },
  };
}
