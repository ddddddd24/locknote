import { db } from '../config/firebase';
import { ref, set, update, onValue, off, Unsubscribe } from 'firebase/database';

/**
 * Write a batch of pixel changes to Firebase.
 * Use update() (not set()) so we only touch the changed cells.
 * Set a key to null to erase that pixel.
 */
export async function updatePixels(
  pairId: string,
  changes: Record<string, string | null>,
): Promise<void> {
  const fbUpdates: Record<string, string | null> = {};
  for (const [key, color] of Object.entries(changes)) {
    fbUpdates[`liveCanvas/${pairId}/pixels/${key}`] = color;
  }
  await update(ref(db), fbUpdates);
}

/** Wipe the entire canvas for both users. */
export async function clearCanvas(pairId: string): Promise<void> {
  await set(ref(db, `liveCanvas/${pairId}/pixels`), null);
}

/**
 * Subscribe to the live pixel grid.
 * Fires with the full current pixel map whenever any pixel changes.
 */
export function subscribeLiveCanvas(
  pairId: string,
  onUpdate: (pixels: Record<string, string>) => void,
): Unsubscribe {
  const r = ref(db, `liveCanvas/${pairId}/pixels`);
  onValue(r, (snap) => onUpdate((snap.val() as Record<string, string>) ?? {}));
  return () => off(r);
}
