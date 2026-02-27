/**
 * SayangScreen — shared live pixel-art canvas.
 * Both users draw on the same 24×24 grid in real time via Firebase.
 *
 * Tools  : pencil, fill bucket, eraser
 * Brush  : 1×1, 2×2, 3×3
 * Actions: undo (local), clear (both), grid toggle
 * Palette: 32 curated pixel-art colours in 4 rows
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Rect } from 'react-native-svg';

import { useApp }                               from '../context/AppContext';
import { clearCanvas, subscribeLiveCanvas, updatePixels } from '../services/liveCanvas';
import { COLORS }                               from '../theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const GRID   = 24;                    // 24×24 pixel grid
const FLUSH  = 120;                   // ms between Firebase batch writes

/** 32-colour pixel-art palette (4 rows × 8 colours). */
const PALETTE: string[] = [
  // Row 0 — neutrals
  '#000000', '#1a1a1a', '#555555', '#888888', '#bbbbbb', '#e8e8e8', '#ffffff', '#fffde0',
  // Row 1 — reds / oranges / yellows
  '#e94560', '#c0392b', '#e67e22', '#f5a623', '#f1c40f', '#d4ac0d', '#8b6914', '#4a3000',
  // Row 2 — greens / teals
  '#2ecc71', '#27ae60', '#4ecca3', '#1abc9c', '#16a085', '#0e6655', '#1a5c3a', '#0d3320',
  // Row 3 — blues / purples / pinks
  '#3498db', '#2980b9', '#8e44ad', '#9b59b6', '#c86dd7', '#e91e8c', '#ff9fce', '#aa5588',
];

type Tool = 'pencil' | 'fill' | 'eraser';

// ── Flood-fill ────────────────────────────────────────────────────────────────

function floodFill(
  pixels: Record<string, string>,
  startX: number,
  startY: number,
  fillColor: string,
): Record<string, string | null> {
  const targetKey   = `${startX}_${startY}`;
  const targetColor = pixels[targetKey] ?? null;
  if (targetColor === fillColor) return {};

  const changes: Record<string, string | null> = {};
  const visited = new Set<string>();
  const queue: [number, number][]               = [[startX, startY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) continue;
    const k = `${x}_${y}`;
    if (visited.has(k)) continue;
    if ((pixels[k] ?? null) !== targetColor) continue;
    visited.add(k);
    changes[k] = fillColor;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return changes;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SayangScreen() {
  const { currentUser } = useApp();
  const { width: winW } = useWindowDimensions();

  const canvasW  = winW - 24;           // full-width minus 12px padding each side
  const cellSize = canvasW / GRID;

  // ── State ──────────────────────────────────────────────────────────────────

  const [pixels,    setPixels]    = useState<Record<string, string>>({});
  const [color,     setColor]     = useState(PALETTE[8]);   // start with red
  const [tool,      setTool]      = useState<Tool>('pencil');
  const [brush,     setBrush]     = useState(1);            // 1 | 2 | 3
  const [showGrid,  setShowGrid]  = useState(true);
  const [canUndo,   setCanUndo]   = useState(false);

  // ── Refs (gesture callbacks need stable, always-current values) ────────────

  const pixelsRef   = useRef<Record<string, string>>({});
  const colorRef    = useRef(color);
  const toolRef     = useRef<Tool>('pencil');
  const brushRef    = useRef(1);

  // Sync refs on every render
  pixelsRef.current = pixels;
  colorRef.current  = color;
  toolRef.current   = tool;
  brushRef.current  = brush;

  // Per-stroke tracking for undo
  const strokePrevRef = useRef<Record<string, string | null>>({});
  const fillDoneRef   = useRef(false);
  const lastKeyRef    = useRef('');

  // Undo stack: array of {key → prevColor} snapshots
  const undoStackRef = useRef<Array<Record<string, string | null>>>([]);

  // Pending Firebase writes
  const pendingRef = useRef<Record<string, string | null>>({});
  const flushRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Firebase subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser?.pairId) return;
    return subscribeLiveCanvas(currentUser.pairId, (incoming) => {
      setPixels(incoming);
    });
  }, [currentUser?.pairId]);

  // Cleanup flush timer on unmount
  useEffect(() => {
    return () => { if (flushRef.current) clearTimeout(flushRef.current); };
  }, []);

  // ── Write helpers ──────────────────────────────────────────────────────────

  function scheduleFlush() {
    if (flushRef.current || !currentUser?.pairId) return;
    flushRef.current = setTimeout(async () => {
      flushRef.current = null;
      const batch = { ...pendingRef.current };
      pendingRef.current = {};
      if (Object.keys(batch).length > 0) {
        try { await updatePixels(currentUser.pairId!, batch); } catch { /* silent */ }
      }
    }, FLUSH);
  }

  /**
   * Apply a set of pixel changes optimistically (local state + queue Firebase write).
   * `saveUndo` = false when replaying undo so we don't push the revert itself.
   */
  function applyChanges(changes: Record<string, string | null>, saveUndo = true) {
    if (saveUndo && Object.keys(changes).length > 0) {
      // Capture the "before" state for every changed pixel
      const before: Record<string, string | null> = {};
      for (const key of Object.keys(changes)) {
        before[key] = pixelsRef.current[key] ?? null;
      }
      undoStackRef.current = [...undoStackRef.current.slice(-19), before];
      setCanUndo(true);
    }

    setPixels((prev) => {
      const next = { ...prev };
      for (const [k, c] of Object.entries(changes)) {
        if (c === null) delete next[k];
        else next[k] = c;
      }
      return next;
    });

    Object.assign(pendingRef.current, changes);
    scheduleFlush();
  }

  // ── Undo / Clear ──────────────────────────────────────────────────────────

  function handleUndo() {
    if (undoStackRef.current.length === 0) return;
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);
    applyChanges(last, false);
  }

  function handleClear() {
    if (!currentUser?.pairId) return;
    Alert.alert(
      'Clear canvas',
      'This clears the whole canvas for both of you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearCanvas(currentUser.pairId!);
            undoStackRef.current = [];
            setCanUndo(false);
          },
        },
      ],
    );
  }

  // ── Touch / Paint logic ────────────────────────────────────────────────────

  const handleTouch = useCallback((tx: number, ty: number) => {
    const gx = Math.floor(tx / cellSize);
    const gy = Math.floor(ty / cellSize);
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return;

    if (toolRef.current === 'fill') {
      if (fillDoneRef.current) return; // fill fires once per tap
      fillDoneRef.current = true;
      const changes = floodFill(pixelsRef.current, gx, gy, colorRef.current);
      if (Object.keys(changes).length > 0) {
        // Merge into stroke prev for undo
        for (const key of Object.keys(changes)) {
          if (!(key in strokePrevRef.current)) {
            strokePrevRef.current[key] = pixelsRef.current[key] ?? null;
          }
        }
        applyChanges(changes, false); // undo pushed at stroke end
      }
      return;
    }

    // Pencil / eraser — skip if still on the same cell
    const dedup = `${gx}_${gy}`;
    if (dedup === lastKeyRef.current) return;
    lastKeyRef.current = dedup;

    const newColor = toolRef.current === 'eraser' ? null : colorRef.current;
    const changes: Record<string, string | null> = {};
    const bs = brushRef.current;
    for (let dx = 0; dx < bs; dx++) {
      for (let dy = 0; dy < bs; dy++) {
        const bx = gx + dx;
        const by = gy + dy;
        if (bx >= 0 && bx < GRID && by >= 0 && by < GRID) {
          const k = `${bx}_${by}`;
          if (!(k in strokePrevRef.current)) {
            strokePrevRef.current[k] = pixelsRef.current[k] ?? null;
          }
          changes[k] = newColor;
        }
      }
    }
    applyChanges(changes, false); // undo pushed at stroke end
  }, [cellSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pan gesture ────────────────────────────────────────────────────────────

  const pan = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      strokePrevRef.current = {};
      fillDoneRef.current   = false;
      lastKeyRef.current    = '';
      handleTouch(e.x, e.y);
    })
    .onUpdate((e) => {
      handleTouch(e.x, e.y);
    })
    .onEnd(() => {
      // Push this stroke as one undo entry
      if (Object.keys(strokePrevRef.current).length > 0) {
        undoStackRef.current = [
          ...undoStackRef.current.slice(-19),
          { ...strokePrevRef.current },
        ];
        setCanUndo(true);
      }
      strokePrevRef.current = {};
      lastKeyRef.current    = '';
    }),
  [handleTouch]);

  // ── SVG content (memoised) ─────────────────────────────────────────────────

  const pixelRects = useMemo(() =>
    Object.entries(pixels).map(([key, col]) => {
      const u  = key.indexOf('_');
      const px = parseInt(key.slice(0, u))  * cellSize;
      const py = parseInt(key.slice(u + 1)) * cellSize;
      return (
        <Rect key={key} x={px} y={py} width={cellSize} height={cellSize} fill={col} />
      );
    }),
  [pixels, cellSize]);

  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines: React.ReactElement[] = [];
    for (let i = 0; i <= GRID; i++) {
      const p = i * cellSize;
      lines.push(
        <Line key={`v${i}`} x1={p} y1={0} x2={p} y2={canvasW}
          stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />,
        <Line key={`h${i}`} x1={0} y1={p} x2={canvasW} y2={p}
          stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />,
      );
    }
    return lines;
  }, [showGrid, cellSize, canvasW]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>

        {/* Tool selector */}
        <View style={styles.toolGroup}>
          {([
            ['pencil', '✏️'],
            ['fill',   '🪣'],
            ['eraser', '⌫'],
          ] as [Tool, string][]).map(([t, icon]) => (
            <TouchableOpacity
              key={t}
              style={[styles.toolBtn, tool === t && styles.toolBtnActive]}
              onPress={() => setTool(t)}
            >
              <Text style={styles.toolIcon}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Brush size */}
        <View style={styles.toolGroup}>
          {([1, 2, 3] as const).map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.toolBtn, brush === b && styles.toolBtnActive]}
              onPress={() => setBrush(b)}
            >
              <View style={[styles.brushDot, { width: b * 4 + 2, height: b * 4 + 2, borderRadius: b * 2 + 1 }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.toolGroup}>
          <TouchableOpacity style={[styles.toolBtn, !canUndo && styles.toolBtnDisabled]} onPress={handleUndo} disabled={!canUndo}>
            <Text style={styles.toolIcon}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowGrid((v) => !v)}>
            <Text style={[styles.toolIcon, !showGrid && styles.toolIconDim]}>#</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={handleClear}>
            <Text style={styles.toolIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Canvas ── */}
      <GestureDetector gesture={pan}>
        <View style={[styles.canvas, { width: canvasW, height: canvasW }]}>
          <Svg width={canvasW} height={canvasW}>
            {/* Background */}
            <Rect x={0} y={0} width={canvasW} height={canvasW} fill="#111122" />
            {/* Coloured pixels */}
            {pixelRects}
            {/* Grid lines */}
            {gridLines}
          </Svg>
        </View>
      </GestureDetector>

      {/* ── Selected colour preview ── */}
      <View style={styles.colorPreviewRow}>
        <View style={[styles.colorPreview, { backgroundColor: color }]} />
        <Text style={styles.colorPreviewLabel}>
          {tool === 'eraser' ? 'eraser active' : color}
        </Text>
      </View>

      {/* ── Palette ── */}
      <ScrollView
        horizontal={false}
        scrollEnabled={false}
        style={styles.paletteContainer}
      >
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={styles.paletteRow}>
            {PALETTE.slice(row * 8, row * 8 + 8).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => { setColor(c); setTool('pencil'); }}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  color === c && tool !== 'eraser' && styles.swatchActive,
                ]}
              />
            ))}
          </View>
        ))}
      </ScrollView>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: COLORS.background,
    alignItems:      'center',
    paddingTop:      8,
    paddingBottom:   12,
    gap:             8,
  },

  // Toolbar
  toolbar: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    width:            '100%',
    paddingHorizontal: 12,
  },
  toolGroup: {
    flexDirection:   'row',
    gap:             4,
    backgroundColor: COLORS.surface,
    borderRadius:    10,
    padding:         4,
  },
  toolBtn: {
    width:           34,
    height:          34,
    borderRadius:    7,
    justifyContent:  'center',
    alignItems:      'center',
  },
  toolBtnActive: {
    backgroundColor: COLORS.surfaceHigh,
    borderWidth:     1,
    borderColor:     COLORS.accent,
  },
  toolBtnDisabled: { opacity: 0.35 },
  toolIcon:        { fontSize: 16, color: COLORS.text },
  toolIconDim:     { opacity: 0.35 },
  brushDot:        { backgroundColor: COLORS.white },

  // Canvas
  canvas: {
    borderRadius:    4,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     COLORS.border,
  },

  // Colour preview
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    alignSelf:     'flex-start',
    paddingHorizontal: 12,
  },
  colorPreview: {
    width:        22,
    height:       22,
    borderRadius: 11,
    borderWidth:  2,
    borderColor:  COLORS.border,
  },
  colorPreviewLabel: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'monospace' },

  // Palette
  paletteContainer: { width: '100%', paddingHorizontal: 12 },
  paletteRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  swatch: {
    width:        34,
    height:       34,
    borderRadius: 17,
    borderWidth:  2,
    borderColor:  'transparent',
  },
  swatchActive: {
    borderColor:   COLORS.white,
    transform:     [{ scale: 1.18 }],
  },
});
