/**
 * NudgeAnimation — fullscreen overlay shown when your partner
 * taps "Thinking of you". Auto-dismisses after ~3 s or on tap.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme';

// Haptics — wrapped in try/catch so it silently skips if expo-haptics
// isn't installed or the device doesn't support it.
async function triggerHaptic() {
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // no-op
  }
}

interface NudgeAnimationProps {
  fromName:  string;
  onDismiss: () => void;
}

export function NudgeAnimation({ fromName, onDismiss }: NudgeAnimationProps) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    triggerHaptic();

    Animated.sequence([
      // Appear
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   useNativeDriver: true, tension: 40, friction: 6 }),
        Animated.timing(opacity, { toValue: 1,   duration: 300,         useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(1800),
      // Pulse once
      Animated.spring(scale, { toValue: 1.12, useNativeDriver: true, tension: 80 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 80 }),
      Animated.delay(600),
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, []);

  return (
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
      <Animated.View style={[styles.card, { opacity }]}>
        <Animated.Text style={[styles.heart, { transform: [{ scale }] }]}>
          💓
        </Animated.Text>
        <Text style={styles.name}>{fromName}</Text>
        <Text style={styles.subtitle}>is thinking of you</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,13,26,0.88)',
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          999,
  },
  card: {
    alignItems: 'center',
    gap:        12,
  },
  heart: {
    fontSize:   100,
    lineHeight: 120,
  },
  name: {
    color:      COLORS.text,
    fontSize:   26,
    fontWeight: '700',
  },
  subtitle: {
    color:    COLORS.textSecondary,
    fontSize: 16,
  },
});
