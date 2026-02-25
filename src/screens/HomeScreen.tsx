/**
 * HomeScreen — main screen for bubliboo.
 * Shows the latest note, a daily drawing prompt, the "thinking of you" button,
 * mood picker, and a link to message history.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useApp }                   from '../context/AppContext';
import { subscribeToLatestMessage } from '../services/messages';
import { sendNudge, subscribeToNudges, Nudge } from '../services/nudge';
import { setMood, subscribeMood, MOOD_OPTIONS } from '../services/mood';
import { MessageDisplay }           from '../components/MessageDisplay';
import { NudgeAnimation }           from '../components/NudgeAnimation';
import { getTodayPrompt }           from '../utils/dailyPrompts';
import { LatestMessage, RootStackParamList } from '../types';
import { COLORS } from '../theme';

type NavProp = StackNavigationProp<RootStackParamList, 'Home'>;

const NUDGE_COOLDOWN_MS = 30_000;

export function HomeScreen() {
  const navigation              = useNavigation<NavProp>();
  const { currentUser, partner, refreshPartner } = useApp();
  const [latestMsg,   setLatestMsg]   = useState<LatestMessage | null>(null);
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);
  const [nudgeSent,   setNudgeSent]   = useState(false);
  const [partnerMood, setPartnerMood] = useState<string | null>(null);
  const [myMood,      setMyMood]      = useState<string | null>(null);

  const mountTime    = useRef(Date.now()).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const nudgeBtnAnim = useRef(new Animated.Value(1)).current;
  const cooldownRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayPrompt = getTodayPrompt();

  // ── Header right: history button ─────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
          style={{ marginRight: 16 }}
        >
          <Text style={{ fontSize: 22 }}>📖</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // ── Subscriptions ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser?.pairId) return;

    const unsubMsg = subscribeToLatestMessage(currentUser.pairId, (msg) => {
      if (msg && msg.authorId !== currentUser.id) {
        setLatestMsg(msg);
        playPulse();
      } else if (msg && msg.authorId === currentUser.id) {
        setLatestMsg(null);
      }
    });

    const unsubNudge = subscribeToNudges(currentUser.pairId, (nudge) => {
      if (nudge.senderId !== currentUser.id && nudge.timestamp > mountTime) {
        setActiveNudge(nudge);
      }
    });

    return () => { unsubMsg(); unsubNudge(); };
  }, [currentUser?.pairId, currentUser?.id]);

  // Subscribe to partner's mood.
  useEffect(() => {
    if (!partner?.id) return;
    return subscribeMood(partner.id, setPartnerMood);
  }, [partner?.id]);

  // Subscribe to own mood (to restore on reopen).
  useEffect(() => {
    if (!currentUser?.id) return;
    return subscribeMood(currentUser.id, setMyMood);
  }, [currentUser?.id]);

  useEffect(() => { refreshPartner(); }, []);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  function playPulse() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 150, useNativeDriver: true }),
    ]).start();
  }

  async function handleNudge() {
    if (nudgeSent || !currentUser?.pairId) return;
    Animated.sequence([
      Animated.spring(nudgeBtnAnim, { toValue: 0.92, useNativeDriver: true, speed: 50 }),
      Animated.spring(nudgeBtnAnim, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
    try {
      await sendNudge(currentUser.pairId, currentUser.id, currentUser.name);
      setNudgeSent(true);
      cooldownRef.current = setTimeout(() => setNudgeSent(false), NUDGE_COOLDOWN_MS);
    } catch {
      Alert.alert('Could not send', 'Check your connection and try again.');
    }
  }

  async function handleMoodTap(emoji: string) {
    if (!currentUser?.id) return;
    const next = myMood === emoji ? null : emoji; // tap same emoji to clear
    await setMood(currentUser.id, next);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const partnerName = partner?.name ?? 'your partner';

  return (
    <View style={styles.container}>

      {/* Fullscreen nudge overlay */}
      {activeNudge && (
        <NudgeAnimation
          fromName={activeNudge.senderName}
          onDismiss={() => setActiveNudge(null)}
        />
      )}

      {/* Partner header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{partnerName[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.partnerLabel}>Connected with</Text>
          <Text style={styles.partnerName}>
            {partnerName}{partnerMood ? `  ${partnerMood}` : ''}
          </Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Mood picker */}
      <View style={styles.moodRow}>
        <Text style={styles.moodLabel}>you:</Text>
        {MOOD_OPTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => handleMoodTap(emoji)}
            style={[styles.moodBtn, myMood === emoji && styles.moodBtnActive]}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message display */}
      <Animated.View style={[styles.messageArea, { transform: [{ scale: pulseAnim }] }]}>
        {latestMsg ? (
          <MessageDisplay message={latestMsg} />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.promptLabel}>today's prompt 🎨</Text>
            <Text style={styles.promptText}>{todayPrompt}</Text>
            <Text style={styles.emptyHint}>Draw or write something for {partnerName}</Text>
          </View>
        )}
      </Animated.View>

      {/* Thinking of you */}
      <Animated.View style={{ transform: [{ scale: nudgeBtnAnim }], marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.nudgeBtn, nudgeSent && styles.nudgeBtnSent]}
          onPress={handleNudge}
          activeOpacity={0.85}
          disabled={nudgeSent}
        >
          <Text style={styles.nudgeBtnText}>
            {nudgeSent ? 'sent 💓' : '💓  thinking of you'}
          </Text>
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    marginBottom:    8,
    backgroundColor: COLORS.surface,
    borderRadius:    16,
    padding:         16,
  },
  avatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: COLORS.accentDim,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarText:   { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  headerText:   { flex: 1 },
  partnerLabel: { color: COLORS.textSecondary, fontSize: 11 },
  partnerName:  { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  onlineDot: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: COLORS.success,
  },
  moodRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    marginBottom:   12,
    paddingHorizontal: 4,
  },
  moodLabel:    { color: COLORS.textSecondary, fontSize: 12, marginRight: 4 },
  moodBtn:      { padding: 4, borderRadius: 8 },
  moodBtnActive: { backgroundColor: COLORS.surfaceHigh },
  moodEmoji:    { fontSize: 20 },
  messageArea: {
    flex:            1,
    backgroundColor: COLORS.surface,
    borderRadius:    24,
    justifyContent:  'center',
    alignItems:      'center',
    marginBottom:    16,
    padding:         24,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  emptyState:   { alignItems: 'center', gap: 10 },
  promptLabel: {
    color:      COLORS.accent,
    fontSize:   12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  promptText: {
    color:      COLORS.text,
    fontSize:   20,
    fontWeight: '700',
    textAlign:  'center',
    lineHeight: 28,
  },
  emptyHint:    { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  nudgeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      'center',
  },
  nudgeBtnSent: {
    backgroundColor: COLORS.accentDim,
    opacity:         0.7,
  },
  nudgeBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  composeRow:   { flexDirection: 'row', gap: 12 },
  composeBtn: {
    flex:            1,
    borderRadius:    16,
    paddingVertical: 18,
    alignItems:      'center',
    gap:             6,
  },
  composeBtnText: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accent },
  composeBtnDraw: { backgroundColor: COLORS.accent },
  composeBtnIcon: { fontSize: 28 },
  composeBtnLabel:{ color: COLORS.text, fontWeight: '700', fontSize: 15 },
});
