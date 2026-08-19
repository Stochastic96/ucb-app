import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import useReducedMotion from '../hooks/useReducedMotion';

export default function SkeletonLoader({ lines = 3, avatar = false }) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Respect Reduce Motion: hold a static mid-opacity instead of pulsing.
    if (reducedMotion) {
      opacity.setValue(0.6);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [reducedMotion]);

  return (
    <Animated.View style={{ opacity }}>
      {avatar && <View style={styles.avatar} />}
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={[styles.line, i === lines - 1 && { width: '60%' }]} />
      ))}
    </Animated.View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: c.spacing.md,
  },
  line: {
    height: 14,
    backgroundColor: c.border,
    borderRadius: 7,
    marginBottom: 10,
    width: '100%',
  },
});
