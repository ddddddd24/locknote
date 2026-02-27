/**
 * HomeScreen — minimal hub: partner status, mood, two action buttons, nudge.
 * In-app banners fire when partner sends a doodle or draws in Sayang's home.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useApp }                         from '../context/AppContext';
import { subscribeToLatestMessage }       from '../services/messages';
import {
  canSendDoodleToday,
  getLastDoodleTime,
  nextDoodleResetTime,
} from '../services/messages';
import { sendNudge, subscribeToNudges, Nudge } from '../services/nudge';
import { setMood, subscribeMood, MOOD_OPTIONS } from '../services/mood';
import { subscribeCanvasActivity, CanvasActivity } from '../services/liveCanvas';
import { NudgeAnimation }                 from '../components/NudgeAnimation';
import { InAppBanner }                    from '../components/InAppBanner';
import { RootStackParamList }             from '../types';
import { COLORS }                         from '../theme';

type NavProp = StackNavigationProp<RootStackParamList, 'Home'>;

const NUDGE_COOLDOWN_MS = 30_000;

interface BannerProps { icon: string; message: string; onTap?: () => void; }

export function HomeScreen() {
  const navigation              = useNavigation<NavProp>();
  const { currentUser, partner, refreshPartner } = useApp();

  const [activeNudge,   setActiveNudge]   = useState<Nudge | null>(null);
  const [nudgeSent,     setNudgeSent]     = useState(false);
  const [partnerMood,   setPartnerMood]   = useState<string | null>(null);
  const [myMood,        setMyMood]        = useState<string | null>(null);
  const [banner,        setBanner]        = useState<BannerProps | null>(null);
  const [sayangBadge,   setSayangBadge]   = useState(false);
  const [lastDoodleAt,  setLastDoodleAt]  = useState<number | null>(null);
  const [doodleReady,   setDoodleReady]   = useState(false);

  const mountTime          = useRef(Date.now()).current;
  const nudgeBtnAnim       = useRef(new Animated.Value(1)).current;
  const cooldownRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSayangVisitRef = useRef(0);
  const lastMsgTsRef       = useRef(0);

  // ── Header ──────────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 4, marginRight: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('History')} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20 }}>📖</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  // ── Doodle limit — re-check every time HomeScreen is focused ────────────────

  useFocusEffect(useCallback(() => {
    if (!currentUser?.pairId || !currentUser?.id) return;
    getLastDoodleTime(currentUser.pairId, currentUser.id).then((ts) => {
      setLastDoodleAt(ts);
      setDoodleReady(true);
    });
  }, [currentUser?.pairId, currentUser?.id]));

  // ── Subscriptions ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser?.pairId) return;

    // Latest message — only for in-app banner (drawing is no longer shown on HomeScreen)
    const unsubMsg = subscribeToLatestMessage(currentUser.pairId, (msg) => {
      if (
        msg &&
        msg.authorId !== currentUser.id &&
        msg.timestamp > mountTime &&
        msg.timestamp > lastMsgTsRef.current
      ) {
        lastMsgTsRef.current = msg.timestamp;
        setBanner({
          icon:    '🎨',
          message: `${msg.authorName} sent you a drawing! Check history 📖`,
          onTap:   () => navigation.navigate('History'),
        });
      }
    });

    // Canvas activity — badge + banner
    const unsubCanvas = subscribeCanvasActivity(currentUser.pairId, (info: CanvasActivity) => {
      if (info.userId === currentUser.id) return;              // my own activity
      if (info.timestamp <= mountTime) return;                 // stale on mount
      if (info.timestamp <= lastSayangVisitRef.current) return; // seen already

      setSayangBadge(true);
      setBanner({
        icon:    '🏡',
        message: `${partner?.name ?? 'Your partner'} is drawing in Sayang's home!`,
        onTap:   () => goSayang(),
      });
    });

    // Nudges
    const unsubNudge = subscribeToNudges(currentUser.pairId, (nudge) => {
      if (nudge.senderId !== currentUser.id && nudge.timestamp > mountTime) {
        setActiveNudge(nudge);
      }
    });

    return () => { unsubMsg(); unsubCanvas(); unsubNudge(); };
  }, [currentUser?.pairId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!partner?.id) return;
    return subscribeMood(partner.id, setPartnerMood);
  }, [partner?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    return subscribeMood(currentUser.id, setMyMood);
  }, [currentUser?.id]);

  useEffect(() => { refreshPartner(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

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
    await setMood(currentUser.id, myMood === emoji ? null : emoji);
  }

  function goSayang() {
    lastSayangVisitRef.current = Date.now();
    setSayangBadge(false);
    navigation.navigate('SayangHome');
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const partnerName = partner?.name ?? 'your partner';
  const canDoodle   = doodleReady && canSendDoodleToday(lastDoodleAt);
  const nextReset   = nextDoodleResetTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>

      {/* In-app banner */}
      {banner && (
        <InAppBanner
          icon={banner.icon}
          message={banner.message}
          onTap={banner.onTap}
          onDismiss={() => setBanner(null)}
        />
      )}

      {activeNudge && (
        <NudgeAnimation fromName={activeNudge.senderName} onDismiss={() => setActiveNudge(null)} />
      )}

      {/* Partner header */}
      <View style={styles.header}>
        {partner?.avatarBase64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${partner.avatarBase64}` }}
            style={styles.avatarImg}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{partnerName[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
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

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Thinking of you */}
      <Animated.View style={{ transform: [{ scale: nudgeBtnAnim }], marginBottom: 10 }}>
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

      {/* Bottom action row */}
      <View style={styles.actionRow}>

        {/* Today's doodle */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDoodle, !canDoodle && styles.actionBtnUsed]}
          onPress={() => canDoodle && navigation.navigate('Compose', { mode: 'draw' })}
          disabled={!canDoodle}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>{canDoodle ? '🎨' : '✓'}</Text>
          <View>
            <Text style={styles.actionBtnLabel}>Today's doodle</Text>
            {!canDoodle && (
              <Text style={styles.actionBtnSub}>next at {nextReset}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Sayang's home */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnHome]}
          onPress={goSayang}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>🏡</Text>
          <Text style={styles.actionBtnLabel}>Sayang's home</Text>
          {sayangBadge && <View style={styles.badge} />}
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },

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
  avatarImg:    { width: 44, height: 44, borderRadius: 22 },
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
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 4,
  },
  moodLabel:    { color: COLORS.textSecondary, fontSize: 12, marginRight: 4 },
  moodBtn:      { padding: 4, borderRadius: 8 },
  moodBtnActive: { backgroundColor: COLORS.surfaceHigh },
  moodEmoji:    { fontSize: 20 },

  spacer: { flex: 1 },

  nudgeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      'center',
  },
  nudgeBtnSent: { backgroundColor: COLORS.accentDim, opacity: 0.7 },
  nudgeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex:              1,
    flexDirection:     'row',
    borderRadius:      16,
    paddingVertical:   16,
    paddingHorizontal: 14,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    position:          'relative',
  },
  actionBtnDoodle: { backgroundColor: COLORS.accent },
  actionBtnHome:   { backgroundColor: '#1a5c3a' },
  actionBtnUsed:   { backgroundColor: COLORS.accentDim, opacity: 0.6 },
  actionBtnIcon:   { fontSize: 20 },
  actionBtnLabel:  { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  actionBtnSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 1 },

  badge: {
    position:        'absolute',
    top:             10,
    right:           10,
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: COLORS.accent,
    borderWidth:     2,
    borderColor:     '#1a5c3a',
  },
});
