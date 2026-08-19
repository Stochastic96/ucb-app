import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { formatRelativeFromNow } from '../utils/datetime';
import useReducedMotion from '../hooks/useReducedMotion';

export default function NewsCard({ item, onPress, unread }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const badgeColor = item.courseColor ?? c.primary;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };

  const onPressOut = () => {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, unread && styles.cardUnread]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`${item.source}. ${item.title}`}
      >
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText} numberOfLines={1}>{item.source}</Text>
          </View>
          <Text style={styles.date}>{formatRelativeFromNow(item.date)}</Text>
          {unread && <View style={styles.dot} />}
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    marginHorizontal: c.spacing.md,
    marginVertical: 5,
    borderRadius: c.radius.md,
    padding: 14,
    ...c.shadows.card,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: c.primary },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: c.spacing.sm, gap: c.spacing.sm },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { ...c.type.micro, color: c.onPrimary, maxWidth: 160 },
  date: { ...c.type.micro, fontFamily: c.fonts.body, color: c.textMuted, marginLeft: 'auto' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  title: { ...c.type.bodyStrong, color: c.text, marginBottom: 4 },
  body: { ...c.type.bodySm, color: c.textSecondary },
});
