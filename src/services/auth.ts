/**
 * Pairing system — no traditional auth, just a 6-character invite code.
 *
 * Flow:
 *  User A: createPairCode()  → gets "ABC123", waits
 *  User B: joinWithCode("ABC123") → pair created, both get pairId
 *
 * Firebase structure:
 *  /pairCodes/{code}   { userId, userName, createdAt }
 *  /pairs/{pairId}     { user1, user2, createdAt }
 *  /users/{userId}     { name, pairId, fcmToken }
 */

import { db } from '../config/firebase';
import {
  ref,
  set,
  get,
  remove,
  serverTimestamp,
  onValue,
  Unsubscribe,
} from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, PairCode, Pair } from '../types';

// ─── Local Storage Keys ───────────────────────────────────────────────────────

const STORAGE_KEYS = {
  USER_ID:   'locknote_user_id',
  USER_NAME: 'locknote_user_name',
  PAIR_ID:   'locknote_pair_id',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a random alphanumeric user ID (stored locally, not a real auth UID). */
function generateUserId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** Generate a human-readable 6-character pair code. */
function generatePairCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── User Profile ─────────────────────────────────────────────────────────────

/** Load or initialise the local user profile. */
export async function getOrCreateUser(name: string): Promise<UserProfile> {
  let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  let pairId = await AsyncStorage.getItem(STORAGE_KEYS.PAIR_ID);

  if (!userId) {
    userId = generateUserId();
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }

  await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);

  // Persist/update user profile in Firebase so partner can read our name & token.
  await set(ref(db, `users/${userId}`), {
    name,
    pairId: pairId ?? null,
    fcmToken: null,   // updated separately after notification permission
    updatedAt: Date.now(),
  });

  return { id: userId, name, pairId, fcmToken: null };
}

/** Read the stored user from AsyncStorage (returns null on first launch). */
export async function loadStoredUser(): Promise<{ id: string; name: string; pairId: string | null } | null> {
  const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  const name   = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
  const pairId = await AsyncStorage.getItem(STORAGE_KEYS.PAIR_ID);

  if (!userId || !name) return null;
  return { id: userId, name, pairId };
}

/** Persist the FCM token to Firebase so the partner can send us notifications. */
export async function saveFcmToken(userId: string, token: string): Promise<void> {
  await set(ref(db, `users/${userId}/fcmToken`), token);
}

// ─── Pairing ──────────────────────────────────────────────────────────────────

/**
 * Create a pair code and store it in Firebase.
 * The code expires after 10 minutes (Firebase cleanup rule should enforce this;
 * add a Cloud Function or set Security Rules TTL in production).
 * Returns the code string.
 */
export async function createPairCode(userId: string, userName: string): Promise<string> {
  // Remove any stale code this user may have left behind.
  await clearUserPairCode(userId);

  const code: string = generatePairCode();
  const codeData: PairCode = { userId, userName, createdAt: Date.now() };

  await set(ref(db, `pairCodes/${code}`), codeData);
  return code;
}

/** Remove all pair codes belonging to this user (clean-up). */
async function clearUserPairCode(userId: string): Promise<void> {
  // In a real app you'd index by userId; for simplicity we skip the scan here
  // and rely on Firebase Security Rules + TTL. Left as a no-op placeholder.
}

/**
 * Join with a partner's code.
 * Returns the new pairId on success, or throws on invalid/expired code.
 */
export async function joinWithCode(
  code: string,
  joiningUserId: string,
  joiningUserName: string,
): Promise<string> {
  const codeRef  = ref(db, `pairCodes/${code.toUpperCase()}`);
  const snapshot = await get(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Invalid or expired pair code. Check the code and try again.');
  }

  const codeData: PairCode = snapshot.val();

  if (codeData.userId === joiningUserId) {
    throw new Error("You can't pair with yourself!");
  }

  // Build pair record.
  const pairId = `${codeData.userId}_${joiningUserId}`;
  const pair: Pair = {
    id:        pairId,
    user1:     codeData.userId,
    user2:     joiningUserId,
    createdAt: Date.now(),
  };

  // Write pair + update both user profiles atomically-ish.
  await set(ref(db, `pairs/${pairId}`), pair);
  await set(ref(db, `users/${codeData.userId}/pairId`), pairId);
  await set(ref(db, `users/${joiningUserId}/pairId`), pairId);

  // Delete the one-time code so it can't be reused.
  await remove(codeRef);

  // Persist pairId locally on the joining device.
  await AsyncStorage.setItem(STORAGE_KEYS.PAIR_ID, pairId);

  return pairId;
}

/**
 * Watch the current user's pairId in Firebase.
 * Resolves when the code creator's device detects the partner joined.
 * Returns an unsubscribe function.
 */
export function watchForPairAccepted(
  userId: string,
  onPaired: (pairId: string) => void,
): Unsubscribe {
  const userPairRef = ref(db, `users/${userId}/pairId`);
  return onValue(userPairRef, async (snap) => {
    const pairId: string | null = snap.val();
    if (pairId) {
      await AsyncStorage.setItem(STORAGE_KEYS.PAIR_ID, pairId);
      onPaired(pairId);
    }
  });
}

/** Retrieve the partner's user profile from Firebase. */
export async function getPartnerProfile(pairId: string, myUserId: string): Promise<UserProfile | null> {
  const pairSnap = await get(ref(db, `pairs/${pairId}`));
  if (!pairSnap.exists()) return null;

  const pair: Pair = pairSnap.val();
  const partnerId = pair.user1 === myUserId ? pair.user2 : pair.user1;

  const userSnap = await get(ref(db, `users/${partnerId}`));
  if (!userSnap.exists()) return null;

  return { id: partnerId, ...userSnap.val() };
}
