/**
 * ReactionAnimation — a large emoji that pops up, floats, and fades.
 * Lighter than NudgeAnimation; not fullscreen.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface Props {
  emoji:     string;
  onDismiss: () => void;
}

export function ReactionAnimation({ emoji, onDismiss }: Props) {
  const scale     = useRef(new Animated.Value(0)).current;
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   useNativeDriver: true, tension: 50, friction: 5 }),
        Animated.timing(opacity, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,   duration: 700, useNativeDriver: true }),
      ]),
    ]).start(() => onDismiss());
  }, []);

  return (
    <Animated.Text
      style={[
        styles.emoji,
        { opacity, transform: [{ scale }, { translateY }] },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  emoji: {
    position:  'absolute',
    alignSelf: 'center',
    top:       '35%',
    fontSize:  90,
    zIndex:    500,
  },
});
