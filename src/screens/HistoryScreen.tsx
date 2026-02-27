/**
 * HistoryScreen — all notes and drawings grouped by day.
 * Long-press any card to delete. Tap ▶ to replay a drawing stroke-by-stroke.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp }                        from '../context/AppContext';
import { subscribeToHistory, deleteMessage } from '../services/messages';
import { DrawingPreview }                from '../components/DrawingPreview';
import { AnimatedDrawingReplay }         from '../components/AnimatedDrawingReplay';
import { getPromptForDate }              from '../utils/dailyPrompts';
import { Message }                       from '../types';
import { COLORS }                        from '../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayKey(ts: number): string {
  return new Date(ts).toDateString();
}

function formatSectionDate(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86_400_000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

interface Section {
  title:  string;
  prompt: string;
  data:   Message[];
}

function buildSections(messages: Message[]): Section[] {
  const groups: Record<string, Message[]> = {};
  for (const msg of messages) {
    const key = dayKey(msg.timestamp);
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, data]) => ({
      title:  formatSectionDate(key),
      prompt: getPromptForDate(new Date(key)),
      data:   data.sort((a, b) => b.timestamp - a.timestamp),
    }));
}

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({
  msg, myId, pairId,
}: { msg: Message; myId: string; pairId: string }) {
  const isMine  = msg.authorId === myId;
  const [replaying, setReplaying] = useState(false);

  function confirmDelete() {
    Alert.alert(
      'Delete this note?',
      'It will be removed for both of you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(pairId, msg.id).catch(() =>
            Alert.alert('Error', 'Could not delete. Try again.'),
          ),
        },
      ],
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, isMine ? styles.cardMine : styles.cardTheirs]}
      onLongPress={confirmDelete}
      activeOpacity={0.92}
      delayLongPress={400}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.authorName, isMine && styles.authorMine]}>
          {isMine ? 'You' : msg.authorName}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {msg.type === 'drawing' ? (
        <>
          {replaying ? (
            <AnimatedDrawingReplay
              serialised={msg.content}
              containerStyle={styles.drawingContainer}
            />
          ) : (
            <DrawingPreview serialised={msg.content} style={styles.drawing} />
          )}
          <TouchableOpacity
            style={styles.replayRow}
            onPress={() => setReplaying((r) => !r)}
          >
            <Text style={styles.replayRowText}>
              {replaying ? '■  stop' : '▶  replay'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.textContent}>{msg.content}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function HistoryScreen() {
  const { currentUser } = useApp();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!currentUser?.pairId) return;
    const unsub = subscribeToHistory(currentUser.pairId, (msgs) => {
      setSections(buildSections(msgs));
      setLoading(false);
    });
    return unsub;
  }, [currentUser?.pairId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>Nothing here yet</Text>
        <Text style={styles.emptyHint}>Your notes and drawings will appear here</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.list}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionDate}>{section.title}</Text>
          <Text style={styles.sectionPrompt}>✨ {section.prompt}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <MessageCard
          msg={item}
          myId={currentUser?.id ?? ''}
          pairId={currentUser?.pairId ?? ''}
        />
      )}
      stickySectionHeadersEnabled={false}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  list:         { padding: 16, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 8 },
  emptyIcon:    { fontSize: 48 },
  emptyText:    { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptyHint:    { color: COLORS.textSecondary, fontSize: 14 },

  sectionHeader: { marginTop: 20, marginBottom: 10, gap: 4 },
  sectionDate:   { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  sectionPrompt: { color: COLORS.accent, fontSize: 12, fontStyle: 'italic' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius:    16,
    padding:         16,
    marginBottom:    10,
    borderWidth:     1,
    borderColor:     COLORS.border,
    gap:             10,
  },
  cardMine:    { borderColor: COLORS.accentDim },
  cardTheirs:  {},
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorName:  { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  authorMine:  { color: COLORS.accent },
  timestamp:   { color: COLORS.textSecondary, fontSize: 11 },

  // Static preview keeps a fixed height; replay uses aspectRatio (portrait)
  drawing:          { height: 180, width: '100%', borderRadius: 8, overflow: 'hidden' },
  drawingContainer: { borderRadius: 8 },

  replayRow: {
    alignSelf:       'flex-start',
    backgroundColor: COLORS.surfaceHigh,
    borderRadius:    8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  replayRowText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  textContent: { color: COLORS.text, fontSize: 18, lineHeight: 26 },
});
