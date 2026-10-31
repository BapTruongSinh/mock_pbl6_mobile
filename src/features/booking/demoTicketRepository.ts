import type { BookingState } from './bookingModel';
export interface DemoIssuedBooking {
  id: string;
  accountId: string;
  booking: BookingState;
  issuedAt: number;
  journeyStatus?: 'upcoming' | 'past';
}
const bookings = new Map<string, DemoIssuedBooking>();
export function saveDemoTicket(
  accountId: string,
  booking: BookingState,
  issuedAt: number,
): DemoIssuedBooking {
  const id = `${booking.trip?.id ?? 'NK118'}-DEMO-${booking.expiresAt ?? issuedAt}-${booking.seats.join('-')}`;
  const existing = bookings.get(id);
  if (existing) return existing;
  const issued = { id, accountId, booking: { ...booking, stage: 'ticket' as const }, issuedAt };
  bookings.set(id, issued);
  return issued;
}
export function getDemoTickets(accountId: string): DemoIssuedBooking[] {
  return [...bookings.values()].filter((t) => t.accountId === accountId);
}

export function clearDemoTickets(): void {
  bookings.clear();
}

export function updateDemoBooking(accountId: string, updated: BookingState): void {
  for (const [id, ticket] of bookings) {
    if (
      ticket.accountId === accountId &&
      ticket.booking.expiresAt === updated.expiresAt &&
      ticket.booking.trip?.id === updated.trip?.id &&
      ticket.booking.seats.join(',') === updated.seats.join(',')
    )
      bookings.set(id, { ...ticket, booking: updated });
  }
}
