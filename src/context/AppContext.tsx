/**
 * AppContext — global state for the currently logged-in user and their pair.
 * Keeps auth state in one place so all screens can read/update without prop-drilling.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStoredUser, getOrCreateUser, getPartnerProfile } from '../services/auth';
import { UserProfile } from '../types';

// ─── Shape ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  /** The current device's user. Null while loading. */
  currentUser:  UserProfile | null;
  /** The partner's user profile. Null if not yet paired or not yet loaded. */
  partner:      UserProfile | null;
  /** Whether the initial AsyncStorage load is complete. */
  isLoading:    boolean;
  /** Call after the user enters their name for the first time. */
  login:        (name: string) => Promise<void>;
  /** Called by PairingScreen once a pairId is confirmed. */
  setPairId:    (pairId: string) => Promise<void>;
  /** Refresh partner info from Firebase. */
  refreshPartner: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [partner,     setPartner]     = useState<UserProfile | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  // Boot: try to restore user from local storage.
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadStoredUser();
        if (stored) {
          setCurrentUser({ id: stored.id, name: stored.name, pairId: stored.pairId, fcmToken: null });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Whenever currentUser has a pairId, fetch the partner profile.
  useEffect(() => {
    if (currentUser?.pairId) {
      getPartnerProfile(currentUser.pairId, currentUser.id)
        .then((p) => setPartner(p))
        .catch(console.error);
    }
  }, [currentUser?.pairId, currentUser?.id]);

  const login = useCallback(async (name: string) => {
    const profile = await getOrCreateUser(name);
    setCurrentUser(profile);
  }, []);

  const setPairId = useCallback(async (pairId: string) => {
    await AsyncStorage.setItem('locknote_pair_id', pairId);
    setCurrentUser((prev) => prev ? { ...prev, pairId } : null);
  }, []);

  const refreshPartner = useCallback(async () => {
    if (!currentUser?.pairId) return;
    const p = await getPartnerProfile(currentUser.pairId, currentUser.id);
    setPartner(p);
  }, [currentUser?.pairId, currentUser?.id]);

  const value = useMemo<AppContextValue>(
    () => ({ currentUser, partner, isLoading, login, setPairId, refreshPartner }),
    [currentUser, partner, isLoading, login, setPairId, refreshPartner],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
