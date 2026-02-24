/**
 * LockNoteWidget — the Android home-screen/lock-screen widget UI.
 *
 * react-native-android-widget renders this component tree on the JS thread
 * and passes a serialised layout snapshot to the native Kotlin layer, which
 * then renders it via RemoteViews into the Android App Widget frame.
 *
 * SUPPORTED COMPONENTS (from react-native-android-widget):
 *  FlexWidget  — the root flex container (maps to LinearLayout)
 *  TextWidget  — text label (maps to TextView)
 *  ImageWidget — image (maps to ImageView)
 *
 * UNSUPPORTED: ScrollView, TouchableOpacity, react-native-svg, etc.
 * Keep widget markup simple.
 */

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetData } from '../types';

type LockNoteWidgetProps = Partial<WidgetData>;

export function LockNoteWidget({
  message   = 'No notes yet 💌',
  fromName  = '',
  type      = 'text',
  timestamp,
}: LockNoteWidgetProps) {
  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // For drawing messages show a placeholder — drawings can't be rendered
  // with RemoteViews. The actual drawing is only visible in the app.
  const displayText = type === 'drawing' ? '🎨 Tap to see the drawing →' : message;

  return (
    <FlexWidget
      style={{
        height:          'match_parent',
        width:           'match_parent',
        flexDirection:   'column',
        justifyContent:  'space-between',
        alignItems:      'center',
        backgroundColor: '#0d0d1a',
        borderRadius:    20,
        padding:         16,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header row */}
      <FlexWidget
        style={{
          width:          'match_parent',
          flexDirection:  'row',
          justifyContent: 'space-between',
          alignItems:     'center',
        }}
      >
        <TextWidget
          text="💌 LockNote"
          style={{
            color:      '#e94560',
            fontSize:   13,
            fontWeight: 'bold',
          }}
        />
        {timeLabel ? (
          <TextWidget
            text={timeLabel}
            style={{ color: '#666688', fontSize: 11 }}
          />
        ) : null}
      </FlexWidget>

      {/* Message body */}
      <TextWidget
        text={displayText}
        style={{
          color:      '#f5f5f5',
          fontSize:   type === 'drawing' ? 14 : 18,
          textAlign:  'center',
          fontStyle:  type === 'drawing' ? 'italic' : 'normal',
        }}
        maxLines={5}
      />

      {/* Footer: sender name */}
      <TextWidget
        text={fromName ? `— ${fromName}` : ''}
        style={{
          color:      '#aaaacc',
          fontSize:   12,
          fontStyle:  'italic',
          textAlign:  'right',
          width:      'match_parent',
        }}
      />
    </FlexWidget>
  );
}
