/**
 * InAppBanner — slides in from the top when the app is open.
 * Auto-dismisses after 3.5 s; tap to act + dismiss immediately.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  icon:      string;
  message:   string;
  /** Optional callback when the banner is tapped (e.g. navigate somewhere). */
  onTap?:    () => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3500;

export function InAppBanner({ icon, message, onTap, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(-90)).current;

  useEffect(() => {
    // Slide in
    Animated.spring(translateY, {
      toValue:        0,
      useNativeDriver: true,
      speed:          20,
      bounciness:     6,
    }).start();

    // Auto-dismiss
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    Animated.timing(translateY, {
      toValue:        -90,
      duration:       250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={() => { onTap?.(); dismiss(); }}
        activeOpacity={0.88}
      >
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top:      8,
    left:     12,
    right:    12,
    zIndex:   200,
  },
  inner: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius:    14,
    padding:         14,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    borderWidth:     1,
    borderColor:     COLORS.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    10,
    elevation:       10,
  },
  icon:    { fontSize: 26 },
  message: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
