import { useSessionContext, type SessionContextValue } from './sessionContext';

export function useSession(): SessionContextValue {
  return useSessionContext();
}
