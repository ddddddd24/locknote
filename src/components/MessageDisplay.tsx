/**
 * MessageDisplay — renders a received LatestMessage.
 * Drawings are shown with a stroke-by-stroke animated replay that plays
 * automatically on arrival. A ↺ replay button appears when done.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LatestMessage } from '../types';
import { COLORS } from '../theme';

// ms between each SVG segment being revealed (smaller = faster replay)
const SEG_INTERVAL_MS = 6;

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
      <Text style={styles.from}>
        {message.authorName} {message.type === 'drawing' ? 'drew:' : 'wrote:'}
      </Text>

      {message.type === 'text' ? (
        <Text style={styles.textContent}>{message.content}</Text>
      ) : (
        <AnimatedDrawingReplay serialised={message.content} />
      )}

      <Text style={styles.time}>{timeStr}</Text>
    </View>
  );
}

// ── Animated replay ───────────────────────────────────────────────────────────

type Stroke = { d: string; color: string; width: number };
type StrokeWithSegs = Stroke & { segs: string[] };

interface ReplayProps {
  serialised: string;
}

function AnimatedDrawingReplay({ serialised }: ReplayProps) {
  // Parse strokes once and pre-split each path string into individual commands.
  const strokeSegs = useMemo<StrokeWithSegs[]>(() => {
    try {
      const raw = JSON.parse(serialised) as Stroke[];
      return raw.map((s) => ({ ...s, segs: s.d.trim().split(' ') }));
    } catch {
      return [];
    }
  }, [serialised]);

  // Total number of segments across all strokes.
  const totalSegs = useMemo(
    () => strokeSegs.reduce((sum, s) => sum + s.segs.length, 0),
    [strokeSegs],
  );

  // Monotonically increasing segment counter drives the animation.
  const [currentSeg, setCurrentSeg] = useState(0);
  const isDone = totalSegs > 0 && currentSeg >= totalSegs;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Advance one segment per tick until done.
  useEffect(() => {
    if (isDone || totalSegs === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrentSeg((prev) => prev + 1);
    }, SEG_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDone, totalSegs]);

  // Rebuild visible paths from the segment counter.
  const visiblePaths = useMemo(() => {
    const paths: Stroke[] = [];
    let remaining = currentSeg;

    for (const stroke of strokeSegs) {
      if (remaining <= 0) break;

      if (remaining >= stroke.segs.length) {
        // This stroke is fully visible.
        paths.push({ d: stroke.d, color: stroke.color, width: stroke.width });
        remaining -= stroke.segs.length;
      } else {
        // This stroke is partially visible.
        const partialD = stroke.segs.slice(0, remaining).join(' ');
        paths.push({ d: partialD, color: stroke.color, width: stroke.width });
        break;
      }
    }

    return paths;
  }, [currentSeg, strokeSegs]);

  const replay = useCallback(() => {
    setCurrentSeg(0);
  }, []);

  if (strokeSegs.length === 0) {
    return <Text style={styles.error}>Could not render drawing.</Text>;
  }

  return (
    <View style={styles.drawingContainer}>
      <Svg width="100%" height="100%" viewBox="0 0 300 400">
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { width: '100%', gap: 12, alignItems: 'center' },
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
    height:          240,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius:    12,
    overflow:        'hidden',
  },
  replayBtn: {
    position:        'absolute',
    bottom:          10,
    right:           10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius:    20,
    paddingVertical:  6,
    paddingHorizontal: 14,
  },
  replayBtnText: {
    color:      COLORS.white,
    fontSize:   13,
    fontWeight: '600',
  },
  error:  { color: COLORS.accent, fontSize: 13 },
  time: {
    color:     COLORS.textSecondary,
    fontSize:  11,
    alignSelf: 'flex-end',
  },
});
