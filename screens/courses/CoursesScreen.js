import React, { useState, useEffect, useCallback } from 'react';
import { SectionList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { fetchCourses } from '../../services/courses';
import CourseCard from '../../components/CourseCard';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG } from '../../constants/colors';

function groupBySemester(courses) {
  const map = {};
  courses.forEach((c) => {
    const key = c.semester || 'Other';
    if (!map[key]) map[key] = [];
    map[key].push(c);
  });
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([title, data]) => ({ title, data }));
}

export default function CoursesScreen({ navigation }) {
  const userId = useStore((s) => s.userId);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadCourses = useCallback(async (force = false) => {
    if (!userId) return;
    try {
      setError(null);
      const result = await fetchCourses(userId, force);
      setSections(groupBySemester(result.data));
    } catch (e) {
      setError(e.type ?? 'UNKNOWN');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const onRefresh = () => { setRefreshing(true); loadCourses(true); };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 20 }}>
          <SkeletonLoader lines={5} />
        </View>
      </View>
    );
  }

  if (error && sections.length === 0) {
    return <ErrorState type={error} onRetry={() => { setLoading(true); loadCourses(); }} />;
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CourseCard
          course={item}
          onPress={() =>
            navigation.push('CourseDetail', {
              courseId: item.id,
              title: item.title,
              color: item.color,
            })
          }
        />
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
      }
      contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No courses found.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  sectionHeader: {
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: INACTIVE, fontSize: 15 },
});
