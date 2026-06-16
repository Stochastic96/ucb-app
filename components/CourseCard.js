import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import useReducedMotion from '../hooks/useReducedMotion';

export default function CourseCard({ course, onPress }) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };

  const onPressOut = () => {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`${course.title}${course.lecturerName ? `, ${course.lecturerName}` : ''}${course.semester ? `, ${course.semester}` : ''}`}
      >
        <View style={[styles.colorBar, { backgroundColor: course.color }]} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
          {!!course.lecturerName && (
            <Text style={styles.lecturer} numberOfLines={1}>{course.lecturerName}</Text>
          )}
          {!!course.semester && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{course.semester}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: c.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  colorBar: { width: 5 },
  content: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: '600', color: c.text, lineHeight: 20 },
  lecturer: { fontSize: 13, color: c.textMuted, marginTop: 3 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: c.surfaceSunken,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  badgeText: { fontSize: 11, color: c.textMuted },
});
