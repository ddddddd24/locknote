import { db } from '../config/firebase';
import { ref, set, onValue, off, Unsubscribe } from 'firebase/database';

export interface Reaction {
  emoji:     string;
  senderId:  string;
  timestamp: number;
}

export const REACTION_EMOJIS = ['💗', '😂', '🥹', '😮'];

export async function sendReaction(
  pairId: string,
  senderId: string,
  emoji: string,
): Promise<void> {
  await set(ref(db, `reactions/${pairId}`), { emoji, senderId, timestamp: Date.now() });
}

export function subscribeToReactions(
  pairId: string,
  onReaction: (r: Reaction) => void,
): Unsubscribe {
  const r = ref(db, `reactions/${pairId}`);
  onValue(r, (snap) => { if (snap.exists()) onReaction(snap.val() as Reaction); });
  return () => off(r);
}
