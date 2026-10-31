import {
  MAX_SEATS,
  type BookingDraft,
  type BookingReview,
  type CancellationQuote,
  type CheckInOutcome,
  type CheckInResult,
  type DriverAccount,
  type ManifestEntry,
  type OperationRecord,
  type Passenger,
  type PaymentAttempt,
  type PaymentState,
  type Refund,
  type Result,
  type Seat,
  type SeatHold,
  type Stop,
  type Ticket,
  type TicketStatus,
  type Trip,
  type TripStatus,
} from '../../domain/types';

export const MOCK_STATE_SCHEMA_VERSION = 1 as const;
export const MAX_MOCK_SNAPSHOT_BYTES = 262144;

export interface PersistedOperationEntry {
  accountId: string;
  idempotencyKey: string;
  payloadHash: string;
  record: OperationRecord;
}

export interface MockStateSnapshot {
  schemaVersion: typeof MOCK_STATE_SCHEMA_VERSION;
  seed: string;
  updatedAt: number;
  trips: Trip[];
  seatsByTrip: Record<string, Seat[]>;
  holds: SeatHold[];
  drafts: BookingDraft[];
  reviews: BookingReview[];
  tickets: Ticket[];
  quotes: CancellationQuote[];
  refunds: Refund[];
  manifestsByTrip: Record<string, ManifestEntry[]>;
  driverAccounts: DriverAccount[];
  assignedTripsByDriver: Record<string, string[]>;
  operations: PersistedOperationEntry[];
}

const VALID_TRIP_STATUSES: ReadonlySet<TripStatus> = new Set([
  'scheduled',
  'boarding',
  'departed',
  'inTransit',
  'arrived',
  'completed',
]);

const VALID_SEAT_STATES: ReadonlySet<Seat['state']> = new Set([
  'available',
  'heldByOther',
  'booked',
  'disabled',
]);

const VALID_TICKET_STATUSES: ReadonlySet<TicketStatus> = new Set([
  'issued',
  'checkedIn',
  'cancelled',
  'refunded',
  'used',
]);

const VALID_REFUND_STATES: ReadonlySet<Refund['state']> = new Set([
  'pending',
  'succeeded',
  'failed',
  'unknown',
]);

const VALID_PAYMENT_STATES: ReadonlySet<PaymentState> = new Set([
  'created',
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'unknown',
]);

const VALID_CHECK_IN_OUTCOMES: ReadonlySet<CheckInOutcome> = new Set([
  'success',
  'alreadyCheckedIn',
  'wrongTrip',
  'cancelled',
  'refunded',
  'used',
  'invalid',
  'forbidden',
  'offline',
  'unknown',
]);

export function utf8ByteLength(input: string): number {
  let bytes = 0;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 < input.length) {
        const next = input.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          i += 1;
          continue;
        }
      }
      bytes += 3;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function containsAccessTokenKey(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsAccessTokenKey);
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === 'accessToken' || key.toLowerCase().includes('accesstoken')) {
      return true;
    }
    if (containsAccessTokenKey(record[key])) {
      return true;
    }
  }
  return false;
}

function validateStop(value: unknown): value is Stop {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.address)
  );
}

function validateTrip(value: unknown): value is Trip {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.origin) &&
    isNonEmptyString(value.destination) &&
    isNonEmptyString(value.departureAt) &&
    isNonEmptyString(value.arrivalAt) &&
    isFiniteNonNegativeNumber(value.fareVnd) &&
    typeof value.status === 'string' &&
    VALID_TRIP_STATUSES.has(value.status as TripStatus) &&
    isPositiveInteger(value.version) &&
    Array.isArray(value.pickupStops) &&
    value.pickupStops.every(validateStop) &&
    Array.isArray(value.dropoffStops) &&
    value.dropoffStops.every(validateStop)
  );
}

function validateSeat(value: unknown): value is Seat {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.label) &&
    typeof value.state === 'string' &&
    VALID_SEAT_STATES.has(value.state as Seat['state'])
  );
}

function validateSeatHold(value: unknown, tripIds: ReadonlySet<string>): value is SeatHold {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.tripId) &&
    tripIds.has(value.tripId) &&
    isNonEmptyStringArray(value.seatIds) &&
    value.seatIds.length <= MAX_SEATS &&
    isFiniteNumber(value.expiresAt) &&
    isPositiveInteger(value.version)
  );
}

function validateBookingDraft(value: unknown, tripIds: ReadonlySet<string>): value is BookingDraft {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.guestSessionId) &&
    isNonEmptyString(value.tripId) &&
    tripIds.has(value.tripId) &&
    isNonEmptyStringArray(value.seatIds) &&
    value.seatIds.length <= MAX_SEATS &&
    isNonEmptyString(value.holdId) &&
    isPositiveInteger(value.holdVersion) &&
    isFiniteNumber(value.expiresAt) &&
    isPositiveInteger(value.version) &&
    (value.customerAccountId === undefined || isNonEmptyString(value.customerAccountId))
  );
}

function validatePassenger(value: unknown): value is Passenger {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.seatId) &&
    isNonEmptyString(value.fullName) &&
    isNonEmptyString(value.phone)
  );
}

function validateBookingReview(value: unknown): value is BookingReview {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.draftId) &&
    Array.isArray(value.passengers) &&
    value.passengers.length > 0 &&
    value.passengers.every(validatePassenger) &&
    isFiniteNonNegativeNumber(value.totalVnd) &&
    isPositiveInteger(value.version)
  );
}

function validateTicket(value: unknown, tripIds: ReadonlySet<string>): value is Ticket {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.bookingId) &&
    isNonEmptyString(value.accountId) &&
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.bookingPhone) &&
    isNonEmptyString(value.tripId) &&
    tripIds.has(value.tripId) &&
    isNonEmptyString(value.seatId) &&
    typeof value.status === 'string' &&
    VALID_TICKET_STATUSES.has(value.status as TicketStatus) &&
    isNonEmptyString(value.qrPayload) &&
    isFiniteNonNegativeNumber(value.fareVnd)
  );
}

function validateCancellationQuote(value: unknown): value is CancellationQuote {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.bookingId) &&
    isNonEmptyStringArray(value.ticketIds) &&
    isFiniteNonNegativeNumber(value.refundVnd) &&
    isFiniteNonNegativeNumber(value.feeVnd) &&
    isPositiveInteger(value.version)
  );
}

function validateRefund(value: unknown): value is Refund {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.quoteId) &&
    typeof value.state === 'string' &&
    VALID_REFUND_STATES.has(value.state as Refund['state']) &&
    isNonEmptyString(value.idempotencyKey)
  );
}

function validateManifestEntry(value: unknown): value is ManifestEntry {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.ticketId) &&
    isNonEmptyString(value.passengerName) &&
    isNonEmptyString(value.seatId) &&
    isNonEmptyString(value.pickupStopId) &&
    typeof value.checkedIn === 'boolean'
  );
}

function validateDriverAccount(value: unknown): value is DriverAccount {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.displayName) &&
    isNonEmptyString(value.phone) &&
    (value.email === undefined || isNonEmptyString(value.email))
  );
}

function validatePaymentAttempt(value: unknown): value is PaymentAttempt {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.draftId) &&
    isNonEmptyString(value.accountId) &&
    typeof value.state === 'string' &&
    VALID_PAYMENT_STATES.has(value.state as PaymentState) &&
    isStringArray(value.ticketIds) &&
    isNonEmptyString(value.idempotencyKey)
  );
}

function validateCheckInResult(value: unknown): value is CheckInResult {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.attemptId) &&
    typeof value.outcome === 'string' &&
    VALID_CHECK_IN_OUTCOMES.has(value.outcome as CheckInOutcome) &&
    (value.ticketId === undefined || isNonEmptyString(value.ticketId)) &&
    isNonEmptyString(value.idempotencyKey)
  );
}

function validateOperationRecord(value: unknown): value is OperationRecord {
  if (!isPlainObject(value) || typeof value.kind !== 'string') {
    return false;
  }
  switch (value.kind) {
    case 'payment':
      return validatePaymentAttempt(value.value);
    case 'refund':
      return validateRefund(value.value);
    case 'checkIn':
      return validateCheckInResult(value.value);
    case 'tripTransition':
      return validateTrip(value.value);
    default:
      return false;
  }
}

function validatePersistedOperationEntry(value: unknown): value is PersistedOperationEntry {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.accountId) &&
    isNonEmptyString(value.idempotencyKey) &&
    isNonEmptyString(value.payloadHash) &&
    validateOperationRecord(value.record)
  );
}

export function serializeMockStateSnapshot(snapshot: unknown): Result<string> {
  const parsed = parseMockStateSnapshot(snapshot);
  if (!parsed.ok) {
    return parsed;
  }
  const serialized = JSON.stringify(parsed.value);
  const byteLength = utf8ByteLength(serialized);
  if (byteLength > MAX_MOCK_SNAPSHOT_BYTES) {
    return {
      ok: false,
      code: 'validation',
      message: `demo-state-reset: MockStateSnapshot exceeds byte limit (${byteLength} > ${MAX_MOCK_SNAPSHOT_BYTES})`,
    };
  }
  return { ok: true, value: serialized };
}

export function parseMockStateSnapshot(raw: unknown): Result<MockStateSnapshot> {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot must be a non-null object',
    };
  }

  if (containsAccessTokenKey(raw)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot must never contain accessToken',
    };
  }

  if (raw.schemaVersion !== MOCK_STATE_SCHEMA_VERSION) {
    return {
      ok: false,
      code: 'validation',
      message: `demo-state-reset: Unsupported MockStateSnapshot schemaVersion ${String(raw.schemaVersion)}`,
    };
  }

  if (!isNonEmptyString(raw.seed)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot seed must be a non-empty string',
    };
  }

  if (!isFiniteNumber(raw.updatedAt)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot updatedAt must be a finite number',
    };
  }

  const requiredArrays = [
    'trips',
    'holds',
    'drafts',
    'reviews',
    'tickets',
    'quotes',
    'refunds',
    'driverAccounts',
    'operations',
  ] as const;

  for (const field of requiredArrays) {
    if (!Array.isArray(raw[field])) {
      return {
        ok: false,
        code: 'validation',
        message: `demo-state-reset: MockStateSnapshot.${field} must be an array`,
      };
    }
  }

  if (
    !isPlainObject(raw.seatsByTrip) ||
    !isPlainObject(raw.manifestsByTrip) ||
    !isPlainObject(raw.assignedTripsByDriver)
  ) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot map fields must be plain objects',
    };
  }

  const tripsRaw = raw.trips as unknown[];
  const tripIds = new Set<string>();
  for (const trip of tripsRaw) {
    if (!validateTrip(trip) || tripIds.has(trip.id)) {
      return {
        ok: false,
        code: 'validation',
        message: 'demo-state-reset: MockStateSnapshot.trips contains malformed or duplicate Trip',
      };
    }
    tripIds.add(trip.id);
  }

  const driverAccountsRaw = raw.driverAccounts as unknown[];
  const driverIds = new Set<string>();
  for (const driver of driverAccountsRaw) {
    if (!validateDriverAccount(driver) || driverIds.has(driver.id)) {
      return {
        ok: false,
        code: 'validation',
        message:
          'demo-state-reset: MockStateSnapshot.driverAccounts contains malformed or duplicate DriverAccount',
      };
    }
    driverIds.add(driver.id);
  }

  for (const [tripId, seats] of Object.entries(raw.seatsByTrip)) {
    if (!tripIds.has(tripId) || !Array.isArray(seats) || !seats.every(validateSeat)) {
      return {
        ok: false,
        code: 'validation',
        message: `demo-state-reset: MockStateSnapshot.seatsByTrip[${tripId}] is malformed or references unknown trip`,
      };
    }
  }

  for (const [tripId, entries] of Object.entries(raw.manifestsByTrip)) {
    if (!tripIds.has(tripId) || !Array.isArray(entries) || !entries.every(validateManifestEntry)) {
      return {
        ok: false,
        code: 'validation',
        message: `demo-state-reset: MockStateSnapshot.manifestsByTrip[${tripId}] is malformed or references unknown trip`,
      };
    }
  }

  for (const [driverId, assignedTripIds] of Object.entries(raw.assignedTripsByDriver)) {
    if (
      !driverIds.has(driverId) ||
      !Array.isArray(assignedTripIds) ||
      !assignedTripIds.every((id) => isNonEmptyString(id) && tripIds.has(id))
    ) {
      return {
        ok: false,
        code: 'validation',
        message: `demo-state-reset: MockStateSnapshot.assignedTripsByDriver[${driverId}] is malformed or references unknown trip/driver`,
      };
    }
  }

  if (!(raw.holds as unknown[]).every((hold) => validateSeatHold(hold, tripIds))) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot.holds contains malformed SeatHold',
    };
  }

  if (!(raw.drafts as unknown[]).every((draft) => validateBookingDraft(draft, tripIds))) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot.drafts contains malformed BookingDraft',
    };
  }

  if (!(raw.reviews as unknown[]).every(validateBookingReview)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot.reviews contains malformed BookingReview',
    };
  }

  if (!(raw.tickets as unknown[]).every((ticket) => validateTicket(ticket, tripIds))) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot.tickets contains malformed Ticket',
    };
  }

  if (!(raw.quotes as unknown[]).every(validateCancellationQuote)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot.quotes contains malformed CancellationQuote',
    };
  }

  if (!(raw.refunds as unknown[]).every(validateRefund)) {
    return {
      ok: false,
      code: 'validation',
      message: 'demo-state-reset: MockStateSnapshot.refunds contains malformed Refund',
    };
  }

  if (!(raw.operations as unknown[]).every(validatePersistedOperationEntry)) {
    return {
      ok: false,
      code: 'validation',
      message:
        'demo-state-reset: MockStateSnapshot.operations contains malformed PersistedOperationEntry',
    };
  }

  return {
    ok: true,
    value: raw as unknown as MockStateSnapshot,
  };
}
