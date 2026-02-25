import { db } from '../config/firebase';
import { ref, set, onValue, off, Unsubscribe } from 'firebase/database';

export const MOOD_OPTIONS = ['😊', '🥰', '😴', '😢', '😤', '🤔', '🌙', '✨'];

export async function setMood(userId: string, emoji: string | null): Promise<void> {
  await set(ref(db, `users/${userId}/mood`), emoji);
}

export function subscribeMood(
  userId: string,
  onMood: (emoji: string | null) => void,
): Unsubscribe {
  const moodRef = ref(db, `users/${userId}/mood`);
  onValue(moodRef, (snap) => {
    onMood(snap.exists() ? (snap.val() as string) : null);
  });
  return () => off(moodRef);
}
