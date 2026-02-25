/**
 * Nudge service — "thinking of you" instant signal.
 * Writes a single node to Firebase; both users listen for changes.
 * Firebase path: /nudges/{pairId}
 */

import { db } from '../config/firebase';
import { ref, set, onValue, off } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';

export interface Nudge {
  senderId:   string;
  senderName: string;
  timestamp:  number;
}

export async function sendNudge(
  pairId:     string,
  senderId:   string,
  senderName: string,
): Promise<void> {
  await set(ref(db, `nudges/${pairId}`), {
    senderId,
    senderName,
    timestamp: Date.now(),
  });
}

export function subscribeToNudges(
  pairId:   string,
  onNudge:  (nudge: Nudge) => void,
): Unsubscribe {
  const nudgeRef = ref(db, `nudges/${pairId}`);
  onValue(nudgeRef, (snap) => {
    if (snap.exists()) onNudge(snap.val() as Nudge);
  });
  return () => off(nudgeRef);
}
