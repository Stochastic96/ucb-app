import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfile } from '../../services/profile';
import { fetchCourses } from '../../services/courses';
import { fetchAllEvents } from '../../services/events';
import { fetchNews } from '../../services/news';
import NewsCard from '../../components/NewsCard';
import EventRow from '../../components/EventRow';
import useStore from '../../store/useStore';
import { PRIMARY, DARK, INACTIVE, SURFACE, BG, BORDER } from '../../constants/colors';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getTodayEvents(events) {
  const today = new Date();
  return events.filter((e) => {
    if (!e.start) return false;
    const d = new Date(parseInt(e.start, 10) * 1000 || e.start);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).sort((a, b) => Number(a.start) - Number(b.start));
}

function getNextEvent(events) {
  const now = Date.now();
  return events
    .filter((e) => {
      if (!e.start) return false;
      const ts = parseInt(e.start, 10) * 1000 || new Date(e.start).getTime();
      return ts > now;
    })
    .sort((a, b) => Number(a.start) - Number(b.start))[0] ?? null;
}

function getTimeUntil(isoOrUnix) {
  const ts = parseInt(isoOrUnix, 10) * 1000 || new Date(isoOrUnix).getTime();
  const diff = ts - Date.now();
  if (diff <= 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

const QUICK_LINKS = [
  { label: 'Courses', icon: 'book-outline', tab: 'Courses' },
  { label: 'Timetable', icon: 'calendar-outline', tab: 'Timetable' },
  { label: 'Map', icon: 'map-outline', tab: 'Map' },
  { label: 'Guide', icon: 'compass-outline', screen: 'Guide' },
];

export default function HomeScreen({ navigation }) {
  const user = useStore((s) => s.user);
  const events = useStore((s) => s.events);
  const courses = useStore((s) => s.courses);
  const news = useStore((s) => s.news);
  const userId = useStore((s) => s.userId);

  const load = useCallback(async () => {
    if (!userId) return;
    if (!user) await fetchProfile();
    if (courses.length === 0) await fetchCourses(userId);
    if (events.length === 0 && courses.length > 0) await fetchAllEvents(courses);
    if (news.length === 0) await fetchNews(userId, courses);
  }, [userId, user, courses, events, news]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => load();

  const nextEvent = getNextEvent(events);
  const todayEvents = getTodayEvents(events);
  const topNews = news.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl onRefresh={onRefresh} tintColor={PRIMARY} refreshing={false} />}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.name}>{user?.firstName ?? 'Student'} 👋</Text>
      </View>

      {/* Next class */}
      {nextEvent && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.getParent()?.navigate('Timetable')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={18} color={PRIMARY} />
            <Text style={styles.cardTitle}>Next Class</Text>
          </View>
          <View style={[styles.nextClassBar, { backgroundColor: nextEvent.courseColor }]} />
          <Text style={styles.nextClassTime}>{getTimeUntil(nextEvent.start)}</Text>
          <Text style={styles.nextClassCourse}>{nextEvent.courseTitle}</Text>
          {!!nextEvent.room && (
            <Text style={styles.nextClassRoom}>Room {nextEvent.room}{nextEvent.building ? `, Building ${nextEvent.building}` : ''}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Today's schedule */}
      {todayEvents.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
            <Text style={styles.cardTitle}>Today</Text>
          </View>
          {todayEvents.slice(0, 4).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
          {todayEvents.length === 0 && (
            <Text style={styles.emptyText}>No more classes today 🎉</Text>
          )}
        </View>
      )}

      {/* News preview */}
      {topNews.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Latest News</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NewsFeed')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {topNews.map((item) => (
            <NewsCard key={item.id} item={item} unread={false} onPress={() => navigation.navigate('NewsFeed')} />
          ))}
        </View>
      )}

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.quickLink}
              onPress={() => {
                if (link.tab) navigation.getParent()?.navigate(link.tab);
                else if (link.screen) navigation.navigate(link.screen);
              }}
            >
              <Ionicons name={link.icon} size={28} color={PRIMARY} />
              <Text style={styles.quickLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  header: { padding: 24, paddingBottom: 16, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  greeting: { fontSize: 15, color: INACTIVE },
  name: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginTop: 2 },
  card: {
    backgroundColor: BG,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6 },
  nextClassBar: { height: 3, borderRadius: 2, marginBottom: 8, width: 36 },
  nextClassTime: { fontSize: 20, fontWeight: '800', color: PRIMARY },
  nextClassCourse: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },
  nextClassRoom: { fontSize: 13, color: INACTIVE, marginTop: 3 },
  section: { marginTop: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  seeAll: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  emptyText: { color: INACTIVE, fontSize: 14 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  quickLink: {
    width: '50%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: BG,
    margin: 4,
    borderRadius: 12,
  },
  quickLabel: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
});
