import type {
  BookingDraft,
  BookingReview,
  CancellationQuote,
  CheckInResult,
  DriverAccount,
  ManifestEntry,
  OperationKind,
  OperationRecord,
  Passenger,
  PaymentAttempt,
  Refund,
  Result,
  SearchInput,
  Seat,
  SeatHold,
  Session,
  Ticket,
  Trip,
  TripStatus,
} from '../../domain/types';

export interface AccountProfile {
  accountId: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUri?: string;
  dateOfBirth?: string;
}

export interface TravelRepository {
  getAccountProfile(session: Session): Promise<Result<AccountProfile>>;
  updateAccountProfile(
    session: Session,
    input: { email?: string; phone?: string; dateOfBirth?: string },
  ): Promise<Result<AccountProfile>>;
  updateAccountAvatar(session: Session, avatarUri: string): Promise<Result<AccountProfile>>;
  changePassword(
    session: Session,
    currentPassword: string,
    newPassword: string,
  ): Promise<Result<void>>;
  readonly kind: 'mock' | 'http';
  initialize(): Promise<Result<void>>;
  login(input: { identifier: string; password: string }): Promise<Result<Session>>;
  register(input: {
    fullName: string;
    phone?: string;
    email?: string;
    password: string;
  }): Promise<Result<Session>>;
  logout(session: Session): Promise<void>;
  validateSession(session: Session): Promise<Result<Session>>;
  search(input: SearchInput): Promise<Result<Trip[]>>;
  getTrip(tripId: string): Promise<Result<Trip>>;
  getSeats(tripId: string): Promise<Result<Seat[]>>;
  holdSeats(input: {
    tripId: string;
    seatIds: string[];
    guestSessionId: string;
    idempotencyKey: string;
  }): Promise<Result<SeatHold>>;
  replaceHold(input: {
    holdId: string;
    seatIds: string[];
    version: number;
    guestSessionId: string;
    idempotencyKey: string;
  }): Promise<Result<SeatHold>>;
  releaseHold(input: { holdId: string; guestSessionId: string }): Promise<Result<void>>;
  revalidateHold(input: { holdId: string; version: number }): Promise<Result<SeatHold>>;
  createBookingDraft(input: {
    holdId: string;
    guestSessionId: string;
    idempotencyKey: string;
  }): Promise<Result<BookingDraft>>;
  claimBookingDraft(input: {
    draftId: string;
    guestSessionId: string;
    holdVersion: number;
    session: Session;
  }): Promise<Result<BookingDraft>>;
  savePassengers(input: {
    draftId: string;
    passengers: Passenger[];
    session: Session;
  }): Promise<Result<BookingReview>>;
  getBookingReview(draftId: string, session: Session): Promise<Result<BookingReview>>;
  createPayment(input: {
    draftId: string;
    session: Session;
    idempotencyKey: string;
  }): Promise<Result<PaymentAttempt>>;
  getPayment(attemptId: string, session: Session): Promise<Result<PaymentAttempt>>;
  getTickets(session: Session): Promise<Result<Ticket[]>>;
  getTicket(ticketId: string, session: Session): Promise<Result<Ticket>>;
  lookupTicket(
    input: { code: string; phone: string } | { qrPayload: string },
  ): Promise<Result<Ticket>>;
  quoteCancellation(input: {
    ticketIds: string[];
    session: Session;
  }): Promise<Result<CancellationQuote>>;
  cancelTickets(input: {
    quoteId: string;
    version: number;
    session: Session;
    idempotencyKey: string;
  }): Promise<Result<Refund>>;
  getRefund(refundId: string, session: Session): Promise<Result<Refund>>;
  getAssignedTrips(session: Session): Promise<Result<Trip[]>>;
  getAssignedTrip(tripId: string, session: Session): Promise<Result<Trip>>;
  getDriverAccount(session: Session): Promise<Result<DriverAccount>>;
  getManifest(tripId: string, session: Session): Promise<Result<ManifestEntry[]>>;
  checkIn(input: {
    tripId: string;
    qrPayload?: string;
    ticketCode?: string;
    session: Session;
    idempotencyKey: string;
  }): Promise<Result<CheckInResult>>;
  getCheckIn(attemptId: string, session: Session): Promise<Result<CheckInResult>>;
  transitionTrip(input: {
    tripId: string;
    to: TripStatus;
    version: number;
    session: Session;
    idempotencyKey: string;
  }): Promise<Result<Trip>>;
  getOperation(input: {
    kind: OperationKind;
    idempotencyKey: string;
    session: Session;
  }): Promise<Result<OperationRecord>>;
}
