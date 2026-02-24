/**
 * widgetBridge.ts — writes latest message data to the iOS App Group
 * shared UserDefaults so the WidgetKit extension can read it.
 *
 * Uses react-native-widget-extension (npm: react-native-widget-extension).
 *
 * Setup required (see SETUP.md):
 *  1. Both the main app target and the widget extension target must have the
 *     App Group "group.com.locknote.widget" enabled under Signing & Capabilities.
 *  2. The library is auto-linked via CocoaPods after `pod install`.
 */

import { Platform } from 'react-native';
import type { WidgetData } from '../types';

/**
 * Push the latest message into the shared container so the iOS widget
 * refreshes on the next timeline reload (triggered by reloadAllTimelines).
 * No-op on Android (Android widget reads from AsyncStorage instead).
 */
export async function updateiOSWidget(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    // Dynamic import to keep Android bundle free of iOS-only code.
    const WidgetExtension = (await import('react-native-widget-extension')).default;

    // Serialise to JSON string — matches what LockNoteProvider reads in Swift.
    await WidgetExtension.shareData(
      'locknote_latest_message',
      JSON.stringify(data),
      'group.com.locknote.widget',
    );

    // Trigger an immediate widget timeline reload.
    await WidgetExtension.reloadAllTimelines();
  } catch (err) {
    // Library not linked (e.g. Expo Go) — silently skip.
    console.warn('[widgetBridge] iOS widget update skipped:', err);
  }
}
