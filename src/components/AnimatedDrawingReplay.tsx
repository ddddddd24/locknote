/**
 * AnimatedDrawingReplay — stroke-by-stroke replay of a serialised drawing.
 * Reveals each SVG path segment progressively, then shows a ↺ replay button.
 * viewBox matches the ComposeScreen canvas proportions (380 × 520).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../theme';

type Stroke = { d: string; color: string; width: number };

const SEG_INTERVAL_MS = 6; // ms per SVG segment

interface Props {
  serialised: string;
  /** Optional extra style on the container (e.g. override borderRadius). */
  containerStyle?: ViewStyle;
}

export function AnimatedDrawingReplay({ serialised, containerStyle }: Props) {
  const strokeSegs = useMemo(() => {
    try {
      const raw = JSON.parse(serialised) as Stroke[];
      return raw.map((s) => ({ ...s, segs: s.d.trim().split(' ') }));
    } catch {
      return [];
    }
  }, [serialised]);

  const totalSegs = useMemo(
    () => strokeSegs.reduce((sum, s) => sum + s.segs.length, 0),
    [strokeSegs],
  );

  const [currentSeg, setCurrentSeg] = useState(0);
  const isDone = totalSegs > 0 && currentSeg >= totalSegs;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isDone || totalSegs === 0) return;
    intervalRef.current = setInterval(
      () => setCurrentSeg((p) => p + 1),
      SEG_INTERVAL_MS,
    );
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isDone, totalSegs]);

  const visiblePaths = useMemo(() => {
    const paths: Stroke[] = [];
    let remaining = currentSeg;
    for (const stroke of strokeSegs) {
      if (remaining <= 0) break;
      if (remaining >= stroke.segs.length) {
        paths.push({ d: stroke.d, color: stroke.color, width: stroke.width });
        remaining -= stroke.segs.length;
      } else {
        paths.push({
          d:     stroke.segs.slice(0, remaining).join(' '),
          color: stroke.color,
          width: stroke.width,
        });
        break;
      }
    }
    return paths;
  }, [currentSeg, strokeSegs]);

  const replay = useCallback(() => setCurrentSeg(0), []);

  if (strokeSegs.length === 0) {
    return <Text style={styles.error}>Could not render drawing.</Text>;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* viewBox matches the typical ComposeScreen canvas: 380 wide × 520 tall */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 380 520"
        preserveAspectRatio="xMidYMid meet"
      >
        {visiblePaths.map((s, i) => (
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

      {isDone && (
        <TouchableOpacity style={styles.replayBtn} onPress={replay} activeOpacity={0.75}>
          <Text style={styles.replayBtnText}>↺  replay</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width:           '100%',
    aspectRatio:     380 / 520,   // portrait, matches canvas proportions
    backgroundColor: COLORS.surfaceHigh,
    borderRadius:    12,
    overflow:        'hidden',
  },
  replayBtn: {
    position:          'absolute',
    bottom:            10,
    right:             10,
    backgroundColor:   'rgba(0,0,0,0.45)',
    borderRadius:      20,
    paddingVertical:   6,
    paddingHorizontal: 14,
  },
  replayBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  error:         { color: COLORS.accent, fontSize: 13 },
});
