/**
 * Message service — read/write messages for a pair.
 *
 * Firebase structure:
 *  /messages/{pairId}/latest   LatestMessage   (denormalised for widget reads)
 *  /messages/{pairId}/history/{id}  Message
 */

import { db } from '../config/firebase';
import {
  ref,
  set,
  push,
  remove,
  onValue,
  off,
  Unsubscribe,
} from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Message, LatestMessage, MessageType, WidgetData } from '../types';
import { updateiOSWidget } from './widgetBridge';

// Android widget update helper (no-op on iOS).
async function updateAndroidWidget(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Dynamic import so the iOS bundle doesn't choke on this package.
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { LockNoteWidget } = await import('../widgets/LockNoteWidget');
    const React = await import('react');

    await requestWidgetUpdate({
      widgetName: 'LockNote',
      renderWidget: () =>
        React.default.createElement(LockNoteWidget, {
          message:   data.message,
          fromName:  data.fromName,
          type:      data.type,
          timestamp: data.timestamp,
        }),
      widgetNotFound: () => {
        // Widget not installed on the home screen — silently ignore.
      },
    });
  } catch {
    // Package not available (e.g. running in Expo Go).
  }
}

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Send a message to a pair.
 * Writes to both the history list and the `latest` denormalised snapshot
 * so the widget can update without reading the whole list.
 */
export async function sendMessage(params: {
  pairId:     string;
  authorId:   string;
  authorName: string;
  content:    string;
  type:       MessageType;
}): Promise<void> {
  const { pairId, authorId, authorName, content, type } = params;

  const timestamp = Date.now();

  // Push full message to history.
  const historyRef = ref(db, `messages/${pairId}/history`);
  const newMsgRef  = push(historyRef);
  const message: Message = {
    id: newMsgRef.key!,
    pairId,
    authorId,
    authorName,
    content,
    type,
    timestamp,
    read: false,
  };
  await set(newMsgRef, message);

  // Overwrite the `latest` node — widget & partner screen always read from here.
  const latest: LatestMessage = { content, type, authorId, authorName, timestamp };
  await set(ref(db, `messages/${pairId}/latest`), latest);

  // Cache locally for the widget task handler to read without network.
  const widgetData: WidgetData = {
    message:   content,
    fromName:  authorName,
    type,
    timestamp,
  };
  await AsyncStorage.setItem('locknote_latest_message', JSON.stringify(widgetData));

  // Refresh the home-screen widget on the sender's device immediately
  // (the receiver's widget updates when their app gets the FCM notification).
  await updateAndroidWidget(widgetData);
  await updateiOSWidget(widgetData);
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

/**
 * Listen for changes to the latest message in a pair in real time.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToLatestMessage(
  pairId: string,
  onMessage: (msg: LatestMessage | null) => void,
): Unsubscribe {
  const latestRef = ref(db, `messages/${pairId}/latest`);
  onValue(latestRef, (snap) => {
    onMessage(snap.exists() ? (snap.val() as LatestMessage) : null);
  });
  // Return unsubscribe
  return () => off(latestRef);
}

/**
 * Mark the latest message as read (set read flag on the most recent history entry).
 * Simplified: we just update the `latest` node since we don't paginate history.
 */
export async function markLatestRead(pairId: string): Promise<void> {
  // A real implementation would look up the latest history key and update it.
  // For the MVP we omit this — the UI treats all received messages as read on view.
}

/** Delete a single message from history. */
export async function deleteMessage(pairId: string, messageId: string): Promise<void> {
  await remove(ref(db, `messages/${pairId}/history/${messageId}`));
}

/**
 * Subscribe to the full message history for a pair, sorted newest-first.
 */
export function subscribeToHistory(
  pairId: string,
  onMessages: (messages: Message[]) => void,
): Unsubscribe {
  const historyRef = ref(db, `messages/${pairId}/history`);
  onValue(historyRef, (snap) => {
    if (!snap.exists()) { onMessages([]); return; }
    const msgs = Object.values(snap.val() as Record<string, Message>);
    msgs.sort((a, b) => b.timestamp - a.timestamp);
    onMessages(msgs);
  });
  return () => off(historyRef);
}
