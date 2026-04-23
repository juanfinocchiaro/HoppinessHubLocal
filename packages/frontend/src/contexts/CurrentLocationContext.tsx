/**
 * CurrentLocationContext — Sprint 4
 *
 * Single source of truth for which location (or "all locations") the current
 * user is viewing. Persists selection to localStorage.
 *
 * Rules:
 *  - If user has access to only 1 location → always that location, no switcher shown.
 *  - If user has access to N > 1 locations → last selected (from localStorage).
 *  - If user has account access → adds "All Locations" option (id = '__all__').
 *  - "All Locations" mode is read-only for location-specific resources.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useCurrentUserAccess, type LocationAccess, type AccountAccess } from '@/hooks/useCurrentUserAccess';

export const ALL_LOCATIONS_ID = '__all__';

export interface CurrentLocation {
  id: string;
  name: string;
  isAggregate: boolean;
}

interface CurrentLocationContextValue {
  /** The active location (or aggregate). */
  current: CurrentLocation | null;
  /** All locations the user can access. */
  availableLocations: LocationAccess[];
  /** Account-level access info (null if user has no account access). */
  accountAccess: AccountAccess | null;
  /** True if switcher should be shown (multi-location or account access). */
  showSwitcher: boolean;
  /** Switch to a specific location or '__all__'. */
  setLocationId: (id: string) => void;
}

const CurrentLocationContext = createContext<CurrentLocationContextValue>({
  current: null,
  availableLocations: [],
  accountAccess: null,
  showSwitcher: false,
  setLocationId: () => undefined,
});

const STORAGE_KEY = 'hoppiness:selected_location';

export function CurrentLocationProvider({ children }: { children: ReactNode }) {
  const { locations, account, isLoading } = useCurrentUserAccess();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Initialize when access data loads
  useEffect(() => {
    if (isLoading || locations.length === 0) return;

    // If stored selection is still valid, keep it
    const storedValid =
      selectedId === ALL_LOCATIONS_ID
        ? !!account
        : locations.some((l) => l.id === selectedId);

    if (!storedValid) {
      // Default: first location if only 1, else 'all' if account access, else first
      const defaultId =
        locations.length === 1
          ? locations[0].id
          : account
            ? ALL_LOCATIONS_ID
            : locations[0]?.id ?? null;
      setSelectedId(defaultId);
    }
  }, [isLoading, locations, account, selectedId]);

  function setLocationId(id: string) {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore storage errors
    }
  }

  const current: CurrentLocation | null = useMemo(() => {
    if (!selectedId) return null;

    if (selectedId === ALL_LOCATIONS_ID && account) {
      return { id: ALL_LOCATIONS_ID, name: 'Todos los locales', isAggregate: true };
    }

    const loc = locations.find((l) => l.id === selectedId);
    if (loc) return { id: loc.id, name: loc.name, isAggregate: false };

    // Fallback to first location
    const first = locations[0];
    return first ? { id: first.id, name: first.name, isAggregate: false } : null;
  }, [selectedId, locations, account]);

  const showSwitcher = locations.length > 1 || !!account;

  return (
    <CurrentLocationContext.Provider
      value={{
        current,
        availableLocations: locations,
        accountAccess: account,
        showSwitcher,
        setLocationId,
      }}
    >
      {children}
    </CurrentLocationContext.Provider>
  );
}

export function useCurrentLocation() {
  return useContext(CurrentLocationContext);
}
