/**
 * HomeScreen — main screen shown after pairing.
 * Displays the latest note from the partner in real time.
 * Buttons to compose text or draw.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useApp }                    from '../context/AppContext';
import { subscribeToLatestMessage }  from '../services/messages';
import { MessageDisplay }            from '../components/MessageDisplay';
import { LatestMessage, RootStackParamList } from '../types';
import { COLORS } from '../theme';

type NavProp = StackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation              = useNavigation<NavProp>();
  const { currentUser, partner, refreshPartner } = useApp();
  const [latestMsg, setLatestMsg] = useState<LatestMessage | null>(null);

  // Pulse animation played when a new message arrives.
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subscribe to real-time partner messages.
  useEffect(() => {
    if (!currentUser?.pairId) return;

    const unsub = subscribeToLatestMessage(currentUser.pairId, (msg) => {
      // Only show messages from the partner, not from ourselves.
      if (msg && msg.authorId !== currentUser.id) {
        setLatestMsg(msg);
        playPulse();
      } else if (msg && msg.authorId === currentUser.id) {
        // Message we sent — show as confirmation but dim.
        setLatestMsg(null);
      }
    });

    return unsub;
  }, [currentUser?.pairId, currentUser?.id]);

  // Refresh partner name if it changes.
  useEffect(() => {
    refreshPartner();
  }, []);

  function playPulse() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 150, useNativeDriver: true }),
    ]).start();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const partnerName = partner?.name ?? 'your partner';

  return (
    <View style={styles.container}>
      {/* Partner header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{partnerName[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View>
          <Text style={styles.partnerLabel}>Connected with</Text>
          <Text style={styles.partnerName}>{partnerName}</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Message display */}
      <Animated.View style={[styles.messageArea, { transform: [{ scale: pulseAnim }] }]}>
        {latestMsg ? (
          <MessageDisplay message={latestMsg} />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💭</Text>
            <Text style={styles.emptyText}>No note from {partnerName} yet.</Text>
            <Text style={styles.emptyHint}>Send the first one!</Text>
          </View>
        )}
      </Animated.View>

      {/* Compose buttons */}
      <View style={styles.composeRow}>
        <TouchableOpacity
          style={[styles.composeBtn, styles.composeBtnText]}
          onPress={() => navigation.navigate('Compose', { mode: 'text' })}
        >
          <Text style={styles.composeBtnIcon}>✏️</Text>
          <Text style={styles.composeBtnLabel}>Write</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.composeBtn, styles.composeBtnDraw]}
          onPress={() => navigation.navigate('Compose', { mode: 'draw' })}
        >
          <Text style={styles.composeBtnIcon}>🎨</Text>
          <Text style={styles.composeBtnLabel}>Draw</Text>
        </TouchableOpacity>
      </View>

      {/* Widget hint */}
      <Text style={styles.widgetHint}>
        Add the LockNote widget to your home screen to see notes at a glance.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    marginBottom:   24,
    backgroundColor: COLORS.surface,
    borderRadius:   16,
    padding:        16,
  },
  avatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: COLORS.accentDim,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarText:     { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  partnerLabel:   { color: COLORS.textSecondary, fontSize: 11 },
  partnerName:    { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  onlineDot: {
    marginLeft:      'auto',
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: COLORS.success,
  },
  messageArea: {
    flex:            1,
    backgroundColor: COLORS.surface,
    borderRadius:    24,
    justifyContent:  'center',
    alignItems:      'center',
    marginBottom:    20,
    padding:         24,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  emptyState:     { alignItems: 'center', gap: 8 },
  emptyEmoji:     { fontSize: 52 },
  emptyText:      { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyHint:      { color: COLORS.textSecondary, fontSize: 13 },
  composeRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  composeBtn: {
    flex:           1,
    borderRadius:   16,
    paddingVertical: 18,
    alignItems:     'center',
    gap:            6,
  },
  composeBtnText: { backgroundColor: COLORS.surface,   borderWidth: 1, borderColor: COLORS.accent },
  composeBtnDraw: { backgroundColor: COLORS.accent },
  composeBtnIcon: { fontSize: 28 },
  composeBtnLabel:{ color: COLORS.text, fontWeight: '700', fontSize: 15 },
  widgetHint: {
    textAlign:  'center',
    color:      COLORS.textSecondary,
    fontSize:   12,
    lineHeight: 18,
  },
});
