import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import campusEvents from '../../data/events_campus.json';
import sportsData from '../../data/events_sports.json';
import { loadGoingState } from '../../services/reminders';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapSessionData } from '../../services/bootstrap';
import NewsCard from '../../components/NewsCard';
import EventRow from '../../components/EventRow';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import useStore from '../../store/useStore';
import { PRIMARY, DARK, INACTIVE, SURFACE, BG, BORDER, ACCENT } from '../../constants/colors';
import { navigationRef } from '../../navigation/navigationRef';
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

const EVENT_CATEGORY_COLORS = {
  party: '#E91E63', gaming: '#7B1FA2', social: '#1976D2', academic: '#455A64',
  sports: '#388E3C', outdoor: '#F57C00', cultural: '#D84315', culture: '#00796B',
  recurring: PRIMARY,
};

const JS_DAY_TO_NAME = { 1: 'Monday', 3: 'Wednesday', 4: 'Thursday' };

function getUpcomingCampusEvents(count = 3) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return campusEvents
    .filter((e) => e.date && new Date(e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

function getTodaySports() {
  const dayName = JS_DAY_TO_NAME[new Date().getDay()];
  if (!dayName) return [];
  return sportsData.filter((s) => s.day === dayName);
}

function formatShortDate(dateStr) {
  const [, m, dd] = dateStr.split('-');
  return `${dd}.${m}`;
}

const QUICK_LINKS = [
  { label: 'Courses', icon: 'albums-outline', screen: 'CoursesList' },
  { label: 'Timetable', icon: 'calendar-outline', tab: 'Tools', nestedScreen: 'Timetable' },
  { label: 'Map', icon: 'map-outline', tab: 'Map' },
  { label: 'Guide', icon: 'book-outline', tab: 'Guide' },
];

function QuickLinkButton({ link, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 5 }).start();

  return (
    <Animated.View style={[styles.quickLinkWrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.quickLink}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Ionicons name={link.icon} size={28} color={DARK} />
        <Text style={styles.quickLabel}>{link.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  const openSidebar = useStore((s) => s.openSidebar);
  const goingEventIds = useStore((s) => s.goingEventIds);
  const setGoingEventIds = useStore((s) => s.setGoingEventIds);
  const setGoingSportIds = useStore((s) => s.setGoingSportIds);
  const [loading, setLoading] = useState(
    !dataReady && !user && courses.length === 0 && events.length === 0 && news.length === 0
  );
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

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

  useEffect(() => {
    loadGoingState().then(({ goingEventIds: eIds, goingSportIds: sIds }) => {
      setGoingEventIds(eIds);
      setGoingSportIds(sIds);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const openTab = (tabName) => navigation.navigate(tabName);

  const openRootScreen = (screenName) => {
    const parent = navigation.getParent();
    if (parent) { parent.navigate(screenName); return; }
    navigation.navigate(screenName);
  };

  const nextEvent = getNextEvent(events);
  const todayEvents = getTodayEvents(events);
  const topNews = news.slice(0, 3);
  const upcomingCampusEvents = useMemo(() => getUpcomingCampusEvents(3), []);
  const todaySports = useMemo(() => getTodaySports(), []);

  if (loading || (isHydrating && !dataReady && courses.length === 0 && news.length === 0)) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#3D6B22', '#6FAE3E']} style={styles.headerGradient}>
          <View style={styles.headerPlaceholder} />
        </LinearGradient>
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
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl onRefresh={onRefresh} tintColor={PRIMARY} refreshing={refreshing} />}
    >
      {/* Gradient header */}
      <LinearGradient colors={['#3D6B22', '#6FAE3E']} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.firstName ?? 'Student'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.newsBell}
            onPress={() => openRootScreen('NewsFeed')}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadNewsCount > 0 ? (
              <View style={styles.newsBadge}>
                <Text style={styles.newsBadgeText}>{unreadNewsCount > 9 ? '9+' : unreadNewsCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newsBell}
            onPress={openSidebar}
            activeOpacity={0.85}
          >
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
          onPress={() => navigation.navigate('Tools', { screen: 'Timetable' })}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={18} color={DARK} />
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
            <Ionicons name="calendar-outline" size={18} color={DARK} />
            <Text style={styles.cardTitle}>Today</Text>
          </View>
          {todayEvents.slice(0, 4).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
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

      {/* Upcoming Events */}
      {upcomingCampusEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={18} color={DARK} />
              <Text style={styles.sectionTitle}>Campus Events</Text>
            </View>
            <TouchableOpacity onPress={() => openRootScreen('EventsList')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventsCard}>
            {upcomingCampusEvents.map((ev) => {
              const color = EVENT_CATEGORY_COLORS[ev.category] ?? PRIMARY;
              const isGoing = goingEventIds.includes(ev.id);
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.eventRow}
                  onPress={() => openRootScreen('EventsList')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.eventStripe, { backgroundColor: color }]} />
                  <Text style={styles.eventRowDate}>{formatShortDate(ev.date)}</Text>
                  <Text style={styles.eventRowTitle} numberOfLines={1}>{ev.title}</Text>
                  {isGoing && (
                    <Ionicons name="notifications" size={14} color={PRIMARY} style={{ marginRight: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
            {todaySports.length > 0 && (
              <View style={styles.sportsTonight}>
                <Text style={styles.sportsTonightText}>
                  🏃 Sports today:{' '}
                  {[...new Set(todaySports.map((s) => s.sport))].join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map((link) => (
            <QuickLinkButton
              key={link.label}
              link={link}
              onPress={() => {
                if (link.nestedScreen) navigation.navigate(link.tab, { screen: link.nestedScreen });
                else if (link.tab) openTab(link.tab);
                else if (link.screen) openRootScreen(link.screen);
              }}
            />
          ))}
        </View>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  loadingWrap: { padding: 24 },
  headerGradient: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 20 },
  headerPlaceholder: { height: 52 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newsBell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  newsBadgeText: { color: DARK, fontSize: 10, fontWeight: '700' },
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
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6 },
  nextClassBar: { height: 3, borderRadius: 2, marginBottom: 8, width: 36 },
  nextClassTime: { fontSize: 20, fontWeight: '800', color: DARK },
  nextClassCourse: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },
  nextClassRoom: { fontSize: 13, color: INACTIVE, marginTop: 3 },
  section: { marginTop: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  seeAll: { fontSize: 13, color: DARK, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  quickLinkWrap: { width: '50%', padding: 4 },
  quickLink: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 12,
  },
  quickLabel: { marginTop: 6, fontSize: 13, fontWeight: '600', color: DARK },
  eventsCard: {
    marginHorizontal: 16,
    backgroundColor: BG,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  eventStripe: { width: 4, height: 18, borderRadius: 2 },
  eventRowDate: { fontSize: 12, fontWeight: '700', color: INACTIVE, minWidth: 38 },
  eventRowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  sportsTonight: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sportsTonightText: { fontSize: 13, color: DARK, fontWeight: '500' },
});
