export const MAX_SEATS = 6;
export const HOLD_DURATION_MS = 600000;

export type Role = 'customer' | 'driver';

export type ErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'expired'
  | 'network'
  | 'unknown'
  | 'notImplemented';

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; message: string };

export type Session = {
  accountId: string;
  sessionId: string;
  role: Role;
  accessToken: string;
  expiresAt: number;
};

export type Stop = {
  id: string;
  name: string;
  address: string;
};

export type TripStatus =
  'scheduled' | 'boarding' | 'departed' | 'inTransit' | 'arrived' | 'completed';

export type Trip = {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  fareVnd: number;
  status: TripStatus;
  version: number;
  pickupStops: Stop[];
  dropoffStops: Stop[];
};

export type SearchInput = {
  origin: string;
  destination: string;
  departureDate: string;
  passengerCount: number;
  departurePeriod?: 'morning' | 'afternoon' | 'evening';
  minFareVnd?: number;
  maxFareVnd?: number;
};

export type Seat = {
  id: string;
  label: string;
  state: 'available' | 'heldByOther' | 'booked' | 'disabled';
};

export type SeatHold = {
  id: string;
  tripId: string;
  seatIds: string[];
  expiresAt: number;
  version: number;
};

export type BookingDraft = {
  id: string;
  guestSessionId: string;
  tripId: string;
  seatIds: string[];
  holdId: string;
  holdVersion: number;
  expiresAt: number;
  version: number;
  customerAccountId?: string;
};

export type Passenger = {
  seatId: string;
  fullName: string;
  phone: string;
};

export type BookingReview = {
  draftId: string;
  passengers: Passenger[];
  totalVnd: number;
  version: number;
};

export type PaymentState = 'created' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'unknown';

export type PaymentAttempt = {
  id: string;
  draftId: string;
  accountId: string;
  state: PaymentState;
  ticketIds: string[];
  idempotencyKey: string;
};

export type TicketStatus = 'issued' | 'checkedIn' | 'cancelled' | 'refunded' | 'used';

export type Ticket = {
  id: string;
  bookingId: string;
  accountId: string;
  code: string;
  bookingPhone: string;
  tripId: string;
  seatId: string;
  status: TicketStatus;
  qrPayload: string;
  fareVnd: number;
};

export type CancellationQuote = {
  id: string;
  bookingId: string;
  ticketIds: string[];
  refundVnd: number;
  feeVnd: number;
  version: number;
};

export type Refund = {
  id: string;
  quoteId: string;
  state: 'pending' | 'succeeded' | 'failed' | 'unknown';
  idempotencyKey: string;
};

export type ManifestEntry = {
  ticketId: string;
  passengerName: string;
  seatId: string;
  pickupStopId: string;
  checkedIn: boolean;
};

export type DriverAccount = {
  id: string;
  displayName: string;
  phone: string;
  email?: string;
};

export type OperationKind = 'payment' | 'refund' | 'checkIn' | 'tripTransition';

export type CheckInOutcome =
  | 'success'
  | 'alreadyCheckedIn'
  | 'wrongTrip'
  | 'cancelled'
  | 'refunded'
  | 'used'
  | 'invalid'
  | 'forbidden'
  | 'offline'
  | 'unknown';

export type CheckInResult = {
  attemptId: string;
  outcome: CheckInOutcome;
  ticketId?: string;
  idempotencyKey: string;
};

export type OperationRecord =
  | { kind: 'payment'; value: PaymentAttempt }
  | { kind: 'refund'; value: Refund }
  | { kind: 'checkIn'; value: CheckInResult }
  | { kind: 'tripTransition'; value: Trip };

export interface MockStateStorage {
  load(): Promise<unknown>;
  save(snapshot: unknown): Promise<void>;
  clear(): Promise<void>;
}

export type PendingIntent = {
  accountId: string;
  kind: OperationKind;
  key: string;
};

export interface PendingIntentStorage {
  read(accountId: string): Promise<PendingIntent[]>;
  write(intent: PendingIntent): Promise<void>;
  clear(accountId: string): Promise<void>;
}

export type MockOptions = {
  now: () => number;
  seed: string;
  storage?: MockStateStorage;
  authStorage?: import('../repositories/mock/mockAuthStorage').MockAuthStorage;
};

export type Scenario = {
  id: string;
  route: string;
  reset: () => void;
  expectedTestIds: string[];
};
