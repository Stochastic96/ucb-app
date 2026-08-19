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
    borderRadius: c.radius.md,
    marginHorizontal: c.spacing.md,
    marginVertical: 5,
    overflow: 'hidden',
    ...c.shadows.card,
  },
  colorBar: { width: 5 },
  content: { flex: 1, padding: 14 },
  title: { ...c.type.bodyStrong, color: c.text },
  lecturer: { ...c.type.bodySm, color: c.textMuted, marginTop: 3 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: c.surfaceSunken,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: c.spacing.sm,
  },
  badgeText: { ...c.type.micro, fontFamily: c.fonts.body, color: c.textMuted },
});
