import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapSessionData } from '../../services/bootstrap';
import NewsCard from '../../components/NewsCard';
import EventRow from '../../components/EventRow';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG, BORDER } from '../../constants/colors';
import { isSameCalendarDay, toMillis } from '../../utils/datetime';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getTodayEvents(events) {
  const today = new Date();
  return events
    .filter((event) => isSameCalendarDay(event.start, today))
    .sort((a, b) => (toMillis(a.start) ?? Infinity) - (toMillis(b.start) ?? Infinity));
}

function getNextEvent(events) {
  const now = Date.now();
  return events
    .filter((event) => {
      const millis = toMillis(event.start);
      return millis !== null && millis > now;
    })
    .sort((a, b) => (toMillis(a.start) ?? Infinity) - (toMillis(b.start) ?? Infinity))[0] ?? null;
}

function getTimeUntil(isoOrUnix) {
  const ts = toMillis(isoOrUnix);
  if (ts === null) return '';
  const diff = ts - Date.now();
  if (diff <= 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

const QUICK_LINKS = [
  { label: 'Courses', icon: 'albums-outline', screen: 'CoursesList' },
  { label: 'Timetable', icon: 'calendar-outline', tab: 'Timetable' },
  { label: 'Map', icon: 'map-outline', tab: 'Map' },
  { label: 'Guide', icon: 'book-outline', tab: 'Guide' },
];

export default function HomeScreen({ navigation }) {
  const user = useStore((s) => s.user);
  const events = useStore((s) => s.events);
  const courses = useStore((s) => s.courses);
  const news = useStore((s) => s.news);
  const userId = useStore((s) => s.userId);
  const unreadNewsCount = useStore((s) => s.unreadNewsCount);
  const isHydrating = useStore((s) => s.isHydrating);
  const dataReady = useStore((s) => s.dataReady);
  const bootstrapError = useStore((s) => s.bootstrapError);
  const [loading, setLoading] = useState(
    !dataReady && !user && courses.length === 0 && events.length === 0 && news.length === 0
  );
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      await bootstrapSessionData(force);
    } catch {
      // handled in global store
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!dataReady && !isHydrating) {
      load();
    } else {
      setLoading(false);
    }
  }, [dataReady, isHydrating, load, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const openTab = (tabName) => {
    navigation.navigate(tabName);
  };

  const openRootScreen = (screenName) => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate(screenName);
      return;
    }
    navigation.navigate(screenName);
  };

  const nextEvent = getNextEvent(events);
  const todayEvents = getTodayEvents(events);
  const topNews = news.slice(0, 3);

  if (loading || (isHydrating && !dataReady && courses.length === 0 && news.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <SkeletonLoader lines={7} />
        </View>
      </View>
    );
  }

  if (bootstrapError && courses.length === 0 && events.length === 0 && news.length === 0) {
    return <ErrorState type={bootstrapError.type} onRetry={() => { setLoading(true); load(true); }} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl onRefresh={onRefresh} tintColor={PRIMARY} refreshing={refreshing} />}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.firstName ?? 'Student'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.newsBell} onPress={() => openRootScreen('NewsFeed')} activeOpacity={0.85}>
          <Ionicons name="notifications-outline" size={22} color="#1A1A1A" />
          {unreadNewsCount > 0 ? (
            <View style={styles.newsBadge}>
              <Text style={styles.newsBadgeText}>{unreadNewsCount > 9 ? '9+' : unreadNewsCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {bootstrapError && (
        <View style={styles.inlineWarning}>
          <Ionicons name="alert-circle-outline" size={18} color="#B26A00" />
          <Text style={styles.inlineWarningText}>
            Some campus data could not be loaded. Pull to refresh and try again.
          </Text>
        </View>
      )}

      {/* Next class */}
      {nextEvent && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => openTab('Timetable')}
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
            <TouchableOpacity onPress={() => openRootScreen('NewsFeed')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {topNews.map((item) => (
            <NewsCard key={item.id} item={item} unread={false} onPress={() => openRootScreen('NewsFeed')} />
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
                if (link.tab) openTab(link.tab);
                else if (link.screen) openRootScreen(link.screen);
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
  loadingWrap: { padding: 24 },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 15, color: INACTIVE },
  name: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginTop: 2 },
  newsBell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsBadge: {
    position: 'absolute',
    top: 5,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  newsBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  inlineWarning: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFF4DE',
    borderColor: '#F1D29B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  inlineWarningText: { flex: 1, color: '#8C5A00', fontSize: 13, lineHeight: 18 },
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
