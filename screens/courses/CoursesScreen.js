import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SectionList, FlatList, View, Text, StyleSheet, RefreshControl, Animated } from 'react-native';
import { bootstrapSessionData } from '../../services/bootstrap';
import CourseCard from '../../components/CourseCard';
import SearchBar from '../../components/SearchBar';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG, BORDER } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

function groupBySemester(courses) {
  const map = {};
  courses.forEach((c) => {
    const key = c.semester || 'Current Semester';
    if (!map[key]) map[key] = [];
    map[key].push(c);
  });
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([title, data]) => ({ title, data }));
}

export default function CoursesScreen({ navigation }) {
  const t = useTranslation();
  const courses = useStore((s) => s.courses);
  const dataReady = useStore((s) => s.dataReady);
  const isHydrating = useStore((s) => s.isHydrating);
  const bootstrapError = useStore((s) => s.bootstrapError);

  const [sections, setSections] = useState(() => groupBySemester(courses));
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loading = isHydrating || (!dataReady && !bootstrapError);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return courses.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.lecturer?.toLowerCase().includes(q) ||
        c.semester?.toLowerCase().includes(q)
    );
  }, [query, courses]);

  useEffect(() => {
    setSections(groupBySemester(courses));
  }, [courses]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await bootstrapSessionData(true);
    } catch {}
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 20 }}>
          <SkeletonLoader lines={5} />
        </View>
      </View>
    );
  }

  if (bootstrapError && sections.length === 0) {
    return <ErrorState type={bootstrapError.type} onRetry={onRefresh} />;
  }

  const isSearching = query.trim().length > 0;

  const renderCourseItem = ({ item }) => (
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
  );

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.searchWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('courses_search_placeholder')}
        />
      </View>

      {isSearching ? (
        <FlatList
          style={styles.container}
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('courses_no_results', { query })}</Text>
            </View>
          }
        />
      ) : (
        <SectionList
          style={styles.container}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
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
              <Text style={styles.emptyText}>{t('courses_empty')}</Text>
            </View>
          }
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  searchWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
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
