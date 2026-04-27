import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { INACTIVE, BG } from '../constants/colors';

export default function CourseCard({ course, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
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
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  colorBar: { width: 5 },
  content: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', lineHeight: 20 },
  lecturer: { fontSize: 13, color: INACTIVE, marginTop: 3 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  badgeText: { fontSize: 11, color: INACTIVE },
});
