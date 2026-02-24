/**
 * DrawingCanvas — a finger-painting canvas built with react-native-svg.
 *
 * Strokes are stored as SVG path `d` strings (M x,y L x,y …).
 * When the user lifts their finger, the completed path is committed and
 * serialised to a compact JSON string that's stored in Firebase as the
 * message content for 'drawing' type messages.
 *
 * The serialised format is:
 *   JSON.stringify([ { d: "M10,10 L20,30", color: "#fff", width: 4 }, … ])
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { TouchableOpacity, Text } from 'react-native';
import { COLORS } from '../theme';

interface Stroke {
  d:     string;
  color: string;
  width: number;
}

interface DrawingCanvasProps {
  /** Called whenever the set of strokes changes (lifted finger or clear). */
  onPathsChange: (serialised: string) => void;
}

const PALETTE = ['#ffffff', '#e94560', '#4ecca3', '#f5a623', '#50a3f5', '#c86dd7'];

export function DrawingCanvas({ onPathsChange }: DrawingCanvasProps) {
  const [strokes,      setStrokes]      = useState<Stroke[]>([]);
  const [activeColor,  setActiveColor]  = useState(COLORS.white);
  const [brushWidth,   setBrushWidth]   = useState(4);

  // Current in-progress path while finger is down.
  const activePath = useRef<string>('');

  const serialise = useCallback((s: Stroke[]) => {
    onPathsChange(JSON.stringify(s));
  }, [onPathsChange]);

  // ── Gesture ───────────────────────────────────────────────────────────────

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      activePath.current = `M${e.x.toFixed(1)},${e.y.toFixed(1)}`;
    })
    .onUpdate((e) => {
      activePath.current += ` L${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      // Force a re-render so the SVG shows the stroke in real time.
      // We don't commit to `strokes` yet — allPaths merges activePath at render time.
      setStrokes((prev) => [...prev]);
    })
    .onEnd(() => {
      const finalPath = activePath.current;
      if (!finalPath) return;
      setStrokes((prev) => {
        const newStrokes = [...prev, { d: finalPath, color: activeColor, width: brushWidth }];
        serialise(newStrokes);
        return newStrokes;
      });
      activePath.current = '';
    });

  // For live preview, merge committed strokes + current active path.
  const allPaths: Stroke[] = activePath.current
    ? [...strokes, { d: activePath.current, color: activeColor, width: brushWidth }]
    : strokes;

  const handleClear = () => {
    setStrokes([]);
    activePath.current = '';
    onPathsChange('');
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      serialise(next);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.wrapper}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.palette}>
          {PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                activeColor === c && styles.swatchActive,
              ]}
              onPress={() => setActiveColor(c)}
            />
          ))}
        </View>
        <View style={styles.widthPicker}>
          {[2, 4, 8].map((w) => (
            <TouchableOpacity
              key={w}
              style={[styles.widthBtn, brushWidth === w && styles.widthBtnActive]}
              onPress={() => setBrushWidth(w)}
            >
              <View style={[styles.widthDot, { width: w * 2, height: w * 2, borderRadius: w }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Canvas */}
      <GestureDetector gesture={pan}>
        <View style={styles.canvas}>
          <Svg width="100%" height="100%">
            {allPaths.map((s, i) => (
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
      </GestureDetector>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleUndo} disabled={strokes.length === 0}>
          <Text style={[styles.actionText, strokes.length === 0 && styles.actionDisabled]}>↩ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleClear} disabled={strokes.length === 0}>
          <Text style={[styles.actionText, strokes.length === 0 && styles.actionDisabled]}>✕ Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:      { flex: 1, gap: 8 },
  toolbar:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  palette:      { flexDirection: 'row', gap: 8, flex: 1 },
  swatch: {
    width:        28,
    height:       28,
    borderRadius: 14,
    borderWidth:  2,
    borderColor:  'transparent',
  },
  swatchActive: { borderColor: COLORS.white, transform: [{ scale: 1.15 }] },
  widthPicker:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  widthBtn: {
    width:        32,
    height:       32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems:   'center',
    backgroundColor: COLORS.surface,
  },
  widthBtnActive: { backgroundColor: COLORS.surfaceHigh, borderWidth: 1, borderColor: COLORS.accent },
  widthDot:     { backgroundColor: COLORS.white },
  canvas: {
    flex:            1,
    backgroundColor: COLORS.surface,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     COLORS.border,
    overflow:        'hidden',
  },
  actions:      { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex:           1,
    padding:        10,
    borderRadius:   10,
    backgroundColor: COLORS.surface,
    alignItems:     'center',
  },
  actionText:   { color: COLORS.text, fontSize: 14 },
  actionDisabled: { color: COLORS.textSecondary, opacity: 0.4 },
});
