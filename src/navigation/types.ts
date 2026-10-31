import type { SearchInput, TripStatus } from '../domain/types';

export type RootStackParamList = {
  Welcome: undefined;
  BookingFlow: { tripId: string };
  DemoTickets: undefined;
  Login:
    | { returnTarget?: 'booking' | 'tickets' | 'account' | 'cancellation'; intentId?: string }
    | undefined;
  Register: undefined;
  GuestMenu: undefined;
  GuestTicketLookup: undefined;
  GuestScan: undefined;
  GuestTicketResult: { lookupId: string };
  CustomerHome: undefined;
  SearchResults: { search?: SearchInput } | undefined;
  SearchFilters: { searchId: string };
  EditRoute: { searchId?: string } | undefined;
  SeatSelection: { tripId: string };
  PassengerDetails: { draftId: string };
  BookingReview: { draftId: string };
  VNPayCheckout: { draftId: string };
  PaymentReturn: { operationKey: string };
  MyTickets: { filter: 'all' | 'upcoming' };
  TicketDetail: { ticketId: string };
  CustomerAccount: undefined;
  CancellationSelection: { bookingId: string };
  CancellationPreview: { quoteId: string };
  CancellationConfirm: { quoteId: string };
  RefundProcessing: { operationKey: string };
  DriverTrips: { tab?: 'today' | 'upcoming' | 'completed' } | undefined;
  DriverRoute: undefined;
  DriverTripDetail: { tripId: string };
  DriverAccount: undefined;
  DriverManifest: { tripId: string; pickupStopId?: string; unboardedOnly?: boolean };
  DriverScan: { tripId: string };
  DriverManualCode: { tripId: string };
  DriverCheckInResult: { tripId: string; operationKey: string };
  DriverTransitionConfirm: { tripId: string; to: TripStatus; version: number };
};
