import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapSessionData } from '../../services/bootstrap';
import { getCampusEvents, getSportsSchedule } from '../../services/contentService';
import { getNewsIdentity } from '../../services/news';
import NewsCard from '../../components/NewsCard';
import EventRow from '../../components/EventRow';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import ListRow from '../../components/ListRow';
import GettingStartedCard from '../../components/GettingStartedCard';
import useStore from '../../store/useStore';
import { CATEGORY_COLORS, FACT_CATEGORY_COLORS } from '../../constants/colors';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { getDailyFact, getFactCopy } from '../../services/facts';
import { isSameCalendarDay, toMillis, getGreeting, getTimeUntil, formatShortDate } from '../../utils/datetime';
import {
  getSportsForDate,
  getTodayCampusEvents,
  getUpcomingCampusEvents,
  isCampusEventActiveOnDate,
} from '../../utils/campusContent';
import { useTranslation } from '../../services/i18n';
import useReducedMotion from '../../hooks/useReducedMotion';

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

function getCampusEventRowLabel(event) {
  if (isCampusEventActiveOnDate(event)) {
    return event.time ? event.time : 'Today';
  }
  if (event.date) {
    return formatShortDate(event.date);
  }
  return event.time ?? 'Today';
}

const QUICK_LINKS = [
  { labelKey: 'home_quick_courses', icon: 'albums-outline', screen: 'CoursesList' },
  { labelKey: 'home_quick_timetable', icon: 'calendar-outline', tab: 'Tools', nestedScreen: 'ToolsHome', nestedParams: { openTimetable: true } },
  { labelKey: 'home_quick_map', icon: 'map-outline', tab: 'Map' },
  { labelKey: 'home_quick_guide', icon: 'book-outline', tab: 'Guide' },
];

export default function HomeScreen({ navigation }) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
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
  const goingSportIds = useStore((s) => s.goingSportIds);
  const language = useStore((s) => s.language);
  const setGoingEventIds = useStore((s) => s.setGoingEventIds);
  const setGoingSportIds = useStore((s) => s.setGoingSportIds);
  const [loading, setLoading] = useState(
    !dataReady && !user && courses.length === 0 && events.length === 0 && news.length === 0
  );
  const [refreshing, setRefreshing] = useState(false);
  const [campusEvents, setCampusEvents] = useState([]);
  const [sportsSchedule, setSportsSchedule] = useState([]);
  const [contentReady, setContentReady] = useState(false);

  const reducedMotion = useReducedMotion();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadDashboardContent = useCallback(async () => {
    const [campusResult, sportsResult] = await Promise.all([
      getCampusEvents(),
      getSportsSchedule(),
    ]);

    return {
      campusEvents: campusResult.data ?? [],
      sportsSchedule: sportsResult.data ?? [],
    };
  }, []);

  const load = useCallback(async (force = false) => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [bootstrapResult, dashboardResult] = await Promise.allSettled([
        bootstrapSessionData(force),
        loadDashboardContent(),
      ]);

      if (dashboardResult.status === 'fulfilled') {
        setCampusEvents(dashboardResult.value.campusEvents);
        setSportsSchedule(dashboardResult.value.sportsSchedule);
      }

      if (bootstrapResult.status === 'rejected') {
        // handled in global store
      }
    } catch {
      // handled in global store
    } finally {
      setContentReady(true);
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDashboardContent, userId]);

  useEffect(() => {
    if (!userId) return;
    if (!dataReady && !isHydrating) {
      load();
    } else {
      setLoading(false);
    }
  }, [dataReady, isHydrating, load, userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refreshDashboardContent = async () => {
        try {
          const nextContent = await loadDashboardContent();
          if (!active) return;
          setCampusEvents(nextContent.campusEvents);
          setSportsSchedule(nextContent.sportsSchedule);
        } catch {
          // offline/local fallback is already handled in the content service
        } finally {
          if (active) setContentReady(true);
        }
      };

      refreshDashboardContent();

      return () => {
        active = false;
      };
    }, [loadDashboardContent])
  );

  useEffect(() => {
    if (!loading) {
      // Respect Reduce Motion: snap to the final position instead of sliding/fading in.
      if (reducedMotion) {
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, reducedMotion]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const openTab = (tabName) => navigation.navigate(tabName);

  const openRootScreen = (screenName, params) => {
    const parent = navigation.getParent();
    if (parent) { parent.navigate(screenName, params); return; }
    navigation.navigate(screenName, params);
  };

  const nextEvent = getNextEvent(events);
  const todayEvents = getTodayEvents(events);
  const topNews = news.slice(0, 3);
  const todayCampusEvents = useMemo(() => getTodayCampusEvents(campusEvents), [campusEvents]);
  const upcomingCampusEvents = useMemo(() => getUpcomingCampusEvents(campusEvents, 3), [campusEvents]);
  const todaySports = useMemo(() => getSportsForDate(sportsSchedule), [sportsSchedule]);
  const dailyFact = useMemo(() => getDailyFact(), []);
  const dailyFactCopy = getFactCopy(dailyFact, language);
  const dailyFactColor = FACT_CATEGORY_COLORS[dailyFact.category] ?? c.primary;
  const campusPreview = todayCampusEvents.length > 0 ? todayCampusEvents.slice(0, 3) : upcomingCampusEvents;
  const hasTodayHighlights = todayCampusEvents.length > 0 || todaySports.length > 0;
  const showCampusSection = contentReady && (campusPreview.length > 0 || todaySports.length > 0);

  if (loading || (isHydrating && !dataReady && courses.length === 0 && news.length === 0)) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[c.primaryDark, c.primary]} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
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
      refreshControl={<RefreshControl onRefresh={onRefresh} tintColor={c.primary} refreshing={refreshing} />}
    >
      {/* Gradient header */}
      <LinearGradient colors={[c.primaryDark, c.primary]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.firstName ?? 'Student'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.newsBell}
            onPress={() => openRootScreen('NewsFeed')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('home_news_a11y')}
          >
            <Ionicons name="notifications-outline" size={22} color={c.onPrimary} />
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
            accessibilityRole="button"
            accessibilityLabel={t('nav_open_menu')}
          >
            <Ionicons name="menu" size={22} color={c.onPrimary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {bootstrapError && (
        <View style={styles.inlineWarning}>
          <Ionicons name="alert-circle-outline" size={18} color={c.onWarning} />
          <Text style={styles.inlineWarningText}>{t('home_error_loading')}</Text>
        </View>
      )}

      {/* First-week checklist — hides itself once done or dismissed */}
      <GettingStartedCard
        onStep={(id) => {
          if (id === 'timetable') navigation.navigate('Tools', { screen: 'ToolsHome', params: { openTimetable: true } });
          else if (id === 'mensa') navigation.navigate('Tools', { screen: 'Mensa' });
          else if (id === 'planner') navigation.navigate('Tools', { screen: 'PlannerList' });
          else if (id === 'guide') openTab('Guide');
          else if (id === 'map') openTab('Map');
        }}
      />

      {/* Did you know? — fact of the day teaser */}
      <TouchableOpacity
        style={[styles.factCard, { borderLeftColor: dailyFactColor }]}
        onPress={() => openRootScreen('FactOfTheDay')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${t('fact_home_title')}: ${dailyFactCopy.hook}`}
      >
        <View style={[styles.factIcon, { backgroundColor: `${dailyFactColor}1A` }]}>
          <Text style={styles.factEmoji}>{dailyFact.emoji}</Text>
        </View>
        <View style={styles.factCopy}>
          <Text style={[styles.factLabel, { color: dailyFactColor }]}>{t('fact_home_title')}</Text>
          <Text style={styles.factHook} numberOfLines={3}>{dailyFactCopy.hook}</Text>
          <Text style={styles.factCta}>{t('fact_home_cta')} →</Text>
        </View>
      </TouchableOpacity>

      {/* Next class */}
      {nextEvent && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Tools', { screen: 'ToolsHome', params: { openTimetable: true } })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${t('home_next_class')}: ${nextEvent.courseTitle}`}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={18} color={c.brandIcon} />
            <Text style={styles.cardTitle}>{t('home_next_class')}</Text>
          </View>
          <View style={[styles.nextClassBar, { backgroundColor: nextEvent.courseColor }]} />
          <Text style={styles.nextClassTime}>{getTimeUntil(nextEvent.start)}</Text>
          <Text style={styles.nextClassCourse}>{nextEvent.courseTitle}</Text>
          {!!nextEvent.room && (
            <Text style={styles.nextClassRoom}>
              {nextEvent.building
                ? t('home_room_building', { room: nextEvent.room, building: nextEvent.building })
                : t('home_room', { room: nextEvent.room })}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Today's schedule */}
      {todayEvents.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color={c.brandIcon} />
            <Text style={styles.cardTitle}>{t('home_today')}</Text>
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
            <Text style={styles.sectionTitle}>{t('home_latest_news')}</Text>
            <TouchableOpacity onPress={() => openRootScreen('NewsFeed')}>
              <Text style={styles.seeAll}>{t('common_see_all')}</Text>
            </TouchableOpacity>
          </View>
          {topNews.map((item) => (
            <NewsCard
              key={getNewsIdentity(item)}
              item={item}
              unread={false}
              onPress={() => openRootScreen('NewsFeed', { preselectedNewsKey: getNewsIdentity(item) })}
            />
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      {showCampusSection && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={18} color={c.brandIcon} />
              <Text style={styles.sectionTitle}>{hasTodayHighlights ? t('home_whats_on') : t('home_campus_events')}</Text>
            </View>
            <TouchableOpacity onPress={() => openRootScreen('EventsList')}>
              <Text style={styles.seeAll}>{t('common_see_all')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventsCard}>
            {campusPreview.map((ev) => {
              const color = CATEGORY_COLORS[ev.category] ?? c.primary;
              const isGoing = goingEventIds.includes(ev.id);
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.eventRow}
                  onPress={() => openRootScreen('EventsList')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.eventStripe, { backgroundColor: color }]} />
                  <Text style={styles.eventRowDate}>{getCampusEventRowLabel(ev)}</Text>
                  <Text style={styles.eventRowTitle} numberOfLines={1}>{ev.title}</Text>
                  {isGoing && (
                    <Ionicons name="notifications" size={14} color={c.primary} style={{ marginRight: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
            {todaySports.length > 0 && (
              <View style={styles.sportsTodayBlock}>
                {campusPreview.length > 0 && <View style={styles.sectionDivider} />}
                <Text style={styles.sportsTodayTitle}>{t('home_sports_today')}</Text>
                {todaySports.slice(0, 4).map((sport) => {
                  const isGoing = goingSportIds.includes(sport.id);
                  return (
                    <TouchableOpacity
                      key={sport.id}
                      style={styles.eventRow}
                      onPress={() => openRootScreen('EventsList')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.eventStripe, { backgroundColor: CATEGORY_COLORS.sports }]} />
                      <Text style={styles.eventRowDate}>{sport.startTime}</Text>
                      <View style={styles.eventRowCopy}>
                        <Text style={styles.eventRowTitle} numberOfLines={1}>{sport.sport}</Text>
                        {!!sport.location && (
                          <Text style={styles.eventRowMeta} numberOfLines={1}>{sport.location}</Text>
                        )}
                      </View>
                      {isGoing && (
                        <Ionicons name="notifications" size={14} color={c.primary} style={{ marginRight: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick links — calm compact rows in one card (global ListRow contract) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home_quick_links')}</Text>
        <View style={styles.quickCard}>
          {QUICK_LINKS.map((link) => (
            <ListRow
              key={link.labelKey}
              compact
              icon={link.icon}
              title={t(link.labelKey)}
              onPress={() => {
                if (link.nestedScreen) navigation.navigate(link.tab, { screen: link.nestedScreen, params: link.nestedParams });
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

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
  greeting: { ...c.type.body, fontFamily: c.fonts.bodyMedium, color: 'rgba(255,255,255,0.85)' },
  name: { ...c.type.display, color: c.onPrimary, marginTop: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newsBell: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    backgroundColor: c.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  newsBadgeText: { ...c.type.micro, color: c.primaryDark },
  inlineWarning: {
    marginHorizontal: c.spacing.md,
    marginTop: 14,
    backgroundColor: c.warningSurface,
    borderColor: c.warningBorder,
    borderWidth: 1,
    borderRadius: c.radius.md,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  inlineWarningText: { ...c.type.bodySm, flex: 1, color: c.onWarning },
  card: {
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: c.radius.md,
    padding: c.spacing.md,
    ...c.shadows.card,
  },
  factCard: {
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...c.shadows.card,
  },
  factIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factEmoji: { fontSize: 26 },
  factCopy: { flex: 1 },
  factLabel: {
    ...c.type.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  factHook: { ...c.type.bodyStrong, fontFamily: c.fonts.bodyBold, color: c.text, marginTop: 3 },
  factCta: { ...c.type.label, color: c.textMuted, marginTop: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { ...c.type.label, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  nextClassBar: { height: 3, borderRadius: 2, marginBottom: 8, width: 36 },
  nextClassTime: { ...c.type.titleLg, color: c.brandIcon },
  nextClassCourse: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text, marginTop: 4 },
  nextClassRoom: { ...c.type.bodySm, color: c.textMuted, marginTop: 3 },
  section: { marginTop: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { ...c.type.title, color: c.text },
  seeAll: { ...c.type.label, color: c.brandIcon },
  quickCard: {
    backgroundColor: c.surface,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: c.radius.lg,
    ...c.shadows.card,
  },
  eventsCard: {
    marginHorizontal: 16,
    backgroundColor: c.surface,
    borderRadius: c.radius.md,
    overflow: 'hidden',
    ...c.shadows.card,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceSunken,
    gap: 10,
  },
  eventStripe: { width: 4, height: 18, borderRadius: 2 },
  eventRowDate: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, color: c.textMuted, minWidth: 38 },
  eventRowCopy: { flex: 1 },
  eventRowTitle: { ...c.type.bodyStrong, flex: 1, color: c.text },
  eventRowMeta: { ...c.type.caption, color: c.textMuted, marginTop: 2 },
  sportsTodayBlock: { backgroundColor: c.accent },
  sportsTodayTitle: {
    ...c.type.label,
    color: c.brandIcon,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  sectionDivider: { height: 1, backgroundColor: c.surfaceSunken },
});
