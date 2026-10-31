import type { Session } from '../domain/types';

export type EntryRoute = 'Guest' | 'Customer' | 'Driver';

export function resolveEntry(session: Session | null): EntryRoute {
  if (!session) {
    return 'Guest';
  }
  if (session.role === 'customer') {
    return 'Customer';
  }
  if (session.role === 'driver') {
    return 'Driver';
  }
  // Unknown or invalid role fails closed to Guest
  return 'Guest';
}
