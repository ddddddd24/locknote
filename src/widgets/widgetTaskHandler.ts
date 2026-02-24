/**
 * widgetTaskHandler — handles Android widget lifecycle events from the native layer.
 *
 * This function is called by react-native-android-widget whenever the OS fires
 * an AppWidget broadcast (ADDED, UPDATE, RESIZED, CLICK, DELETED).
 *
 * It is registered in index.js via:
 *   registerWidgetTaskHandler(widgetTaskHandler)
 *
 * IMPORTANT: This handler runs in a headless JS context when the app is
 * backgrounded. Keep it lightweight — no UI, minimal async work.
 */

import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LockNoteWidget }  from './LockNoteWidget';
import type { WidgetData } from '../types';

const STORAGE_KEY = 'locknote_latest_message';

/** Load the latest cached widget data from AsyncStorage. */
async function loadWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WidgetData;
  } catch {
    // Fall through to defaults.
  }
  return {
    message:   'No notes yet 💌',
    fromName:  '',
    type:      'text',
    timestamp: 0,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, renderWidget, setWidgetNotFound } = props;

  switch (widgetAction) {
    // The user added the widget to their home screen — render immediately.
    case 'WIDGET_ADDED':
    // The OS is requesting a periodic update (respects updatePeriodMillis in XML).
    case 'WIDGET_UPDATE':
    // The user resized the widget — re-render to adapt layout.
    case 'WIDGET_RESIZED': {
      const data = await loadWidgetData();
      renderWidget(
        React.createElement(LockNoteWidget, {
          message:   data.message,
          fromName:  data.fromName,
          type:      data.type,
          timestamp: data.timestamp,
        }),
      );
      break;
    }

    // User tapped the widget — we registered clickAction="OPEN_APP" on the root
    // FlexWidget so this usually just opens the app. No extra logic needed.
    case 'WIDGET_CLICK': {
      break;
    }

    // Widget removed from home screen — nothing to clean up.
    case 'WIDGET_DELETED': {
      break;
    }

    default:
      setWidgetNotFound();
  }
}
