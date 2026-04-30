import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { PRIMARY, INACTIVE, BG } from '../constants/colors';
import { formatRelativeFromNow } from '../utils/datetime';

export default function NewsCard({ item, onPress, unread }) {
  const badgeColor = item.courseColor ?? PRIMARY;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, unread && styles.cardUnread]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: BG,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: PRIMARY },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600', maxWidth: 160 },
  date: { fontSize: 11, color: INACTIVE, marginLeft: 'auto' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  title: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  body: { fontSize: 13, color: '#555555', lineHeight: 18 },
});
