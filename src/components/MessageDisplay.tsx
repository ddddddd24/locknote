/**
 * MessageDisplay — renders a received LatestMessage.
 * For 'text' messages: displays styled text.
 * For 'drawing' messages: deserialises the SVG path JSON and renders via react-native-svg.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LatestMessage } from '../types';
import { COLORS } from '../theme';

interface Props {
  message: LatestMessage;
}

export function MessageDisplay({ message }: Props) {
  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.from}>{message.authorName} wrote:</Text>

      {message.type === 'text' ? (
        <Text style={styles.textContent}>{message.content}</Text>
      ) : (
        <DrawingReplay serialised={message.content} />
      )}

      <Text style={styles.time}>{timeStr}</Text>
    </View>
  );
}

// ── Drawing replay ────────────────────────────────────────────────────────────

interface DrawingReplayProps {
  serialised: string;
}

function DrawingReplay({ serialised }: DrawingReplayProps) {
  type Stroke = { d: string; color: string; width: number };
  let strokes: Stroke[] = [];

  try {
    strokes = JSON.parse(serialised) as Stroke[];
  } catch {
    return <Text style={styles.error}>Could not render drawing.</Text>;
  }

  return (
    <View style={styles.drawingContainer}>
      <Svg width="100%" height="100%" viewBox="0 0 300 200">
        {strokes.map((s, i) => (
          <Path
            key={i}
            d={s.d}
            stroke={s.color}
            strokeWidth={s.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { width: '100%', gap: 12, alignItems: 'center' },
  from: {
    color:      COLORS.accent,
    fontSize:   13,
    fontWeight: '600',
    alignSelf:  'flex-start',
  },
  textContent: {
    color:      COLORS.text,
    fontSize:   22,
    lineHeight: 32,
    textAlign:  'center',
    fontWeight: '500',
  },
  drawingContainer: {
    width:           '100%',
    height:          200,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius:    12,
    overflow:        'hidden',
  },
  time: {
    color:     COLORS.textSecondary,
    fontSize:  11,
    alignSelf: 'flex-end',
  },
  error: { color: COLORS.accent, fontSize: 13 },
});
