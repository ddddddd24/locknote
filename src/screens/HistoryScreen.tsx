/**
 * HistoryScreen — scrollable gallery of all notes and drawings exchanged.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp }               from '../context/AppContext';
import { subscribeToHistory }   from '../services/messages';
import { DrawingPreview }       from '../components/DrawingPreview';
import { Message }              from '../types';
import { COLORS }               from '../theme';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - ts) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function MessageCard({ msg, myId }: { msg: Message; myId: string }) {
  const isMine = msg.authorId === myId;

  return (
    <View style={[styles.card, isMine ? styles.cardMine : styles.cardTheirs]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.authorName, isMine && styles.authorMine]}>
          {isMine ? 'You' : msg.authorName}
        </Text>
        <Text style={styles.timestamp}>{formatTime(msg.timestamp)}</Text>
      </View>

      {msg.type === 'drawing' ? (
        <DrawingPreview serialised={msg.content} style={styles.drawing} />
      ) : (
        <Text style={styles.textContent}>{msg.content}</Text>
      )}
    </View>
  );
}

export function HistoryScreen() {
  const { currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!currentUser?.pairId) return;
    const unsub = subscribeToHistory(currentUser.pairId, (msgs) => {
      setMessages(msgs);
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

  if (messages.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>Nothing here yet</Text>
        <Text style={styles.emptyHint}>Your notes and drawings will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <MessageCard msg={item} myId={currentUser?.id ?? ''} />
      )}
      contentContainerStyle={styles.list}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  list:        { padding: 16, gap: 12 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 8 },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptyHint:   { color: COLORS.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius:    16,
    padding:         16,
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
  drawing:     { height: 200, width: '100%' },
  textContent: { color: COLORS.text, fontSize: 18, lineHeight: 26 },
});
