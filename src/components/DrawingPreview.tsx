/**
 * DrawingPreview — read-only SVG renderer for saved drawings.
 * Uses a fixed viewBox so strokes scale down proportionally regardless of
 * the screen size they were drawn on.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../theme';

interface Stroke {
  d: string;
  color: string;
  width: number;
}

interface DrawingPreviewProps {
  serialised: string;
  style?: ViewStyle;
}

export function DrawingPreview({ serialised, style }: DrawingPreviewProps) {
  let strokes: Stroke[] = [];
  try {
    strokes = JSON.parse(serialised) as Stroke[];
  } catch {
    // malformed — show blank canvas
  }

  return (
    <View style={[styles.container, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 380 520"
        preserveAspectRatio="xMidYMid meet"
      >
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
  container: {
    backgroundColor: COLORS.surface,
    borderRadius:    12,
    overflow:        'hidden',
  },
});
