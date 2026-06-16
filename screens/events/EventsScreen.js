import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { trackScreen } from '../../services/analytics';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SearchBar from '../../components/SearchBar';
import { CATEGORY_COLORS } from '../../constants/colors';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import useStore from '../../store/useStore';
import { getCampusEvents, getSportsSchedule } from '../../services/contentService';
import {
  saveGoingState,
  scheduleEventReminder,
  scheduleSportReminder,
  cancelReminder,
} from '../../services/reminders';
import {
  DAY_ORDER,
  buildCampusEventSections,
  getCurrentDayName,
  groupSportsByDay,
  isCampusEventActiveOnDate,
  isCampusEventPast,
  isCampusEventRecurring,
  normalizeDayName,
  sortSportsEntries,
} from '../../utils/campusContent';
import { formatShortDate, daysUntil } from '../../utils/datetime';
import { useTranslation } from '../../services/i18n';

const SPORT_EMOJI = {
  'Table Tennis': '🏓',
  Yoga: '🧘',
  Basketball: '🏀',
  Wrestling: '🤼',
  Football: '⚽',
  Volleyball: '🏐',
  Dodgeball: '🎯',
  Badminton: '🏸',
  Cricket: '🏏',
};


function EventCard({ ev, isGoing, onToggle, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = CATEGORY_COLORS[ev.category] ?? c.primary;
  const past = isCampusEventPast(ev);
  const today = isCampusEventActiveOnDate(ev);
  const days = ev.date ? daysUntil(ev.date) : null;

  return (
    <View style={[styles.eventCard, past && styles.eventCardPast]}>
      <View style={[styles.eventBorder, { backgroundColor: color }]} />
      <View style={styles.eventDateBox}>
        <Text style={[styles.eventDate, past && styles.dimText]}>
          {formatShortDate(ev.date, ev.endDate)}
        </Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, past && styles.dimText]} numberOfLines={2}>
          {ev.title}
        </Text>
        <Text style={[styles.eventOrganizer, past && styles.dimText]}>{ev.organizer}</Text>
      </View>
      <View style={styles.eventRight}>
        {today && (
          <View style={[styles.badge, { backgroundColor: c.primary }]}>
            <Text style={styles.badgeText}>{t('events_today')}</Text>
          </View>
        )}
        {!past && !today && days !== null && days <= 7 && (
          <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.badgeText}>
              {days === 1 ? t('common_tomorrow') : `${days}d`}
            </Text>
          </View>
        )}
        {!past && (
          <TouchableOpacity
            style={[styles.bellBtn, isGoing && styles.bellBtnActive]}
            onPress={() => onToggle(ev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isGoing ? 'notifications' : 'notifications-outline'}
              size={20}
              color={isGoing ? c.primary : c.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RecurringBanner({ campusEvents, t }) {
  const styles = useThemedStyles(makeStyles);
  const rec = campusEvents.find((event) => isCampusEventRecurring(event));
  if (!rec) return null;
  return (
    <View style={styles.recurringBanner}>
      <Text style={styles.recurringEmoji}>🔁</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.recurringTitle}>{t('events_recurring', { day: rec.recurringDay, time: rec.time })}</Text>
        <Text style={styles.recurringDesc}>{rec.title} — {rec.organizer}</Text>
      </View>
    </View>
  );
}

function CampusEventsTab({ campusEvents, goingEventIds, onToggleEvent, onRefresh, refreshing, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return campusEvents;
    const q = query.toLowerCase();
    return campusEvents.filter(
      (ev) =>
        ev.title?.toLowerCase().includes(q) ||
        ev.organizer?.toLowerCase().includes(q) ||
        ev.category?.toLowerCase().includes(q)
    );
  }, [campusEvents, query]);

  const sections = useMemo(() => {
    const upcoming = filtered.filter((ev) => !isCampusEventPast(ev));
    const past = filtered.filter((ev) => isCampusEventPast(ev));
    const upcomingSections = buildCampusEventSections(upcoming);
    if (past.length === 0) return upcomingSections;
    const pastSorted = [...past].sort((a, b) => new Date(b.date) - new Date(a.date));
    return [...upcomingSections, { title: t('events_past_header'), data: pastSorted }];
  }, [filtered, t]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      ListHeaderComponent={
        <>
          <View style={styles.eventsSearchWrapper}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t('events_search_placeholder')}
            />
          </View>
          {!query.trim() && <RecurringBanner campusEvents={campusEvents} t={t} />}
        </>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.monthHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <EventCard
          ev={item}
          isGoing={goingEventIds.includes(item.id)}
          onToggle={onToggleEvent}
          t={t}
        />
      )}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      ListEmptyComponent={<Text style={styles.emptyText}>{t('events_no_campus')}</Text>}
      ListFooterComponent={
        <Text style={styles.footerNote}>{t('events_kadu_note')}</Text>
      }
    />
  );
}

function SportCard({ item, isGoing, onToggle }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const emoji = SPORT_EMOJI[item.sport] ?? '🏃';
  return (
    <View style={[styles.sportCard, isGoing && styles.sportCardGoing]}>
      <Text style={styles.sportEmoji}>{emoji}</Text>
      <View style={styles.sportBody}>
        <Text style={styles.sportName}>{item.sport}</Text>
        <Text style={styles.sportInstructor}>with {item.instructor}</Text>
        {item.note ? <Text style={styles.sportNote}>{item.note}</Text> : null}
      </View>
      <View style={styles.sportRight}>
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{item.startTime}–{item.endTime}</Text>
        </View>
        <View style={[styles.locationBadge, item.location === 'Pitch' && styles.pitchBadge]}>
          <Text style={[styles.locationText, item.location === 'Pitch' && styles.pitchText]}>
            {item.location}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bellBtn, isGoing && styles.bellBtnActive]}
          onPress={() => onToggle(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isGoing ? 'notifications' : 'notifications-outline'}
            size={20}
            color={isGoing ? c.primary : c.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SportsTab({ sportsData, goingSportIds, onToggleSport, onRefresh, refreshing, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [selectedDay, setSelectedDay] = useState(null);
  const availableDays = useMemo(
    () => DAY_ORDER.filter((day) => sportsData.some((entry) => normalizeDayName(entry.day) === day)),
    [sportsData]
  );
  const dayOptions = useMemo(() => [t('common_all'), ...availableDays], [availableDays, t]);

  useEffect(() => {
    const today = getCurrentDayName();
    const fallbackDay = availableDays.includes(today) ? today : t('common_all');

    if (selectedDay === null) {
      setSelectedDay(fallbackDay);
      return;
    }

    if (selectedDay !== t('common_all') && !availableDays.includes(selectedDay)) {
      setSelectedDay(fallbackDay);
    }
  }, [availableDays, selectedDay, t]);

  const activeDay = selectedDay ?? t('common_all');

  const filtered = useMemo(
    () => (
      activeDay === t('common_all')
        ? sortSportsEntries(sportsData)
        : sortSportsEntries(sportsData.filter((item) => normalizeDayName(item.day) === activeDay))
    ),
    [activeDay, sportsData, t]
  );

  const grouped = useMemo(() => {
    if (activeDay !== t('common_all')) return null;
    return groupSportsByDay(sportsData);
  }, [activeDay, sportsData, t]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={c.mode === 'dark' ? '#90CAF9' : '#1565C0'} />
        <Text style={styles.infoText}>{t('events_sports_info')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {dayOptions.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, activeDay === d && styles.chipActive]}
            onPress={() => setSelectedDay(d)}
          >
            <Text style={[styles.chipText, activeDay === d && styles.chipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {grouped
        ? grouped.map(([day, items]) => (
            <View key={day}>
              <Text style={styles.dayHeader}>{day}</Text>
              {items.map((item) => (
                <SportCard
                  key={item.id}
                  item={item}
                  isGoing={goingSportIds.includes(item.id)}
                  onToggle={onToggleSport}
                />
              ))}
            </View>
          ))
        : filtered.map((item) => (
            <SportCard
              key={item.id}
              item={item}
              isGoing={goingSportIds.includes(item.id)}
              onToggle={onToggleSport}
            />
          ))}

      {filtered.length === 0 && (
        <Text style={styles.emptyText}>{t('events_no_sports')}</Text>
      )}

      <Text style={styles.footerNote}>{t('events_sports_note')}</Text>
    </ScrollView>
  );
}

export default function EventsScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  useEffect(() => { trackScreen('EventsScreen'); }, []);
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const [activeTab, setActiveTab] = useState('events');
  const [campusEvents, setCampusEvents] = useState([]);
  const [sportsData, setSportsData] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const goingEventIds = useStore((s) => s.goingEventIds);
  const goingSportIds = useStore((s) => s.goingSportIds);
  const addGoingEvent = useStore((s) => s.addGoingEvent);
  const removeGoingEvent = useStore((s) => s.removeGoingEvent);
  const addGoingSport = useStore((s) => s.addGoingSport);
  const removeGoingSport = useStore((s) => s.removeGoingSport);

  const loadContent = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingContent(true);
    setContentError(false);

    try {
      const [campusResult, sportsResult] = await Promise.all([
        getCampusEvents(),
        getSportsSchedule(),
      ]);
      setCampusEvents(campusResult.data ?? []);
      setSportsData(sportsResult.data ?? []);
    } catch {
      setContentError(true);
    } finally {
      setLoadingContent(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [loadContent])
  );

  const handleToggleEvent = useCallback(async (ev) => {
    const going = goingEventIds.includes(ev.id);
    if (going) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      removeGoingEvent(ev.id);
      await cancelReminder(`event_${ev.id}`);
      const next = goingEventIds.filter((x) => x !== ev.id);
      await saveGoingState(next, goingSportIds);
    } else {
      // Check if notifications are enabled in app settings
      const { settings } = useStore.getState();
      if (!settings.notificationsEnabled) {
        Alert.alert(
          t('events_notif_disabled_title'),
          t('events_notif_disabled_in_settings'),
          [{ text: t('common_ok') }]
        );
        return;
      }

      const ok = await scheduleEventReminder(ev);
      if (ok === false && !isCampusEventPast(ev)) {
        Alert.alert(
          t('events_notif_disabled_title'),
          t('events_notif_disabled_msg'),
          [{ text: t('common_ok') }]
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      addGoingEvent(ev.id);
      const next = [...goingEventIds, ev.id];
      await saveGoingState(next, goingSportIds);
      if (ok) {
        Alert.alert(t('events_reminder_set_title'), t('events_reminder_event_msg', { title: ev.title }), [{ text: t('common_ok') }]);
      }
    }
  }, [goingEventIds, goingSportIds, t]);

  const handleToggleSport = useCallback(async (sport) => {
    const going = goingSportIds.includes(sport.id);
    if (going) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      removeGoingSport(sport.id);
      await cancelReminder(`sport_${sport.id}`);
      const next = goingSportIds.filter((x) => x !== sport.id);
      await saveGoingState(goingEventIds, next);
    } else {
      // Check if notifications are enabled in app settings
      const { settings } = useStore.getState();
      if (!settings.notificationsEnabled) {
        Alert.alert(
          t('events_notif_disabled_title'),
          t('events_notif_disabled_in_settings'),
          [{ text: t('common_ok') }]
        );
        return;
      }

      const ok = await scheduleSportReminder(sport);
      if (ok === false) {
        Alert.alert(
          t('events_notif_disabled_title'),
          t('events_notif_disabled_msg'),
          [{ text: t('common_ok') }]
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      addGoingSport(sport.id);
      const next = [...goingSportIds, sport.id];
      await saveGoingState(goingEventIds, next);
      Alert.alert(
        t('events_reminder_set_title'),
        t('events_reminder_sport_msg', { sport: sport.sport, day: sport.day }),
        [{ text: t('common_ok') }]
      );
    }
  }, [goingEventIds, goingSportIds, t]);

  const goingCount = goingEventIds.length + goingSportIds.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {canGoBack && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={26} color={c.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.screenTitle}>{t('screen_events')}</Text>
        </View>
        {goingCount > 0 && (
          <View style={styles.goingPill}>
            <Ionicons name="notifications" size={13} color={c.onPrimary} />
            <Text style={styles.goingPillText}>
              {goingCount === 1 ? t('events_reminders_count_one') : t('events_reminders_count', { count: goingCount })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'events' && styles.tabBtnActive]}
          onPress={() => setActiveTab('events')}
        >
          <Ionicons name="calendar-outline" size={16} color={activeTab === 'events' ? c.primary : c.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'events' && styles.tabBtnTextActive]}>
            {t('events_tab_campus')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'sports' && styles.tabBtnActive]}
          onPress={() => setActiveTab('sports')}
        >
          <Ionicons name="basketball-outline" size={16} color={activeTab === 'sports' ? c.primary : c.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'sports' && styles.tabBtnTextActive]}>
            {t('events_tab_sports')}
          </Text>
          {goingSportIds.length > 0 && (
            <View style={styles.tabCountDot}>
              <Text style={styles.tabCountDotText}>{goingSportIds.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {loadingContent ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.loadingText}>{t('events_loading')}</Text>
          </View>
        ) : contentError ? (
          <ScrollView
            contentContainerStyle={styles.errorState}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadContent(true)} tintColor={c.primary} />
            }
          >
            <Ionicons name="cloud-offline-outline" size={48} color={c.border} />
            <Text style={styles.errorTitle}>{t('events_error_title')}</Text>
            <Text style={styles.errorSub}>{t('events_error_msg')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadContent()}>
              <Ionicons name="refresh" size={16} color={c.onPrimary} />
              <Text style={styles.retryBtnText}>{t('common_retry')}</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : activeTab === 'events' ? (
          <CampusEventsTab
            campusEvents={campusEvents}
            goingEventIds={goingEventIds}
            onToggleEvent={handleToggleEvent}
            onRefresh={() => loadContent(true)}
            refreshing={refreshing}
            t={t}
          />
        ) : (
          <SportsTab
            sportsData={sportsData}
            goingSportIds={goingSportIds}
            onToggleSport={handleToggleSport}
            onRefresh={() => loadContent(true)}
            refreshing={refreshing}
            t={t}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  eventsSearchWrapper: { paddingVertical: 10 },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { padding: 2 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: c.text },
  goingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  goingPillText: { color: c.onPrimary, fontSize: 12, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.surfaceSunken,
  },
  tabBtnActive: { backgroundColor: c.primary + '18' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  tabBtnTextActive: { color: c.primary },
  tabCountDot: {
    backgroundColor: c.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountDotText: { color: c.onPrimary, fontSize: 10, fontWeight: '700' },

  // Event cards
  monthHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 14, color: c.textMuted, fontWeight: '500' },
  errorState: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 80 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  errorSub: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  retryBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
  emptyText: { color: c.textMuted, fontSize: 14, marginTop: 24, marginBottom: 8 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: c.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  eventCardPast: { opacity: 0.45 },
  eventBorder: { width: 4, alignSelf: 'stretch' },
  eventDateBox: { paddingHorizontal: 12, paddingVertical: 14, minWidth: 64 },
  eventDate: { fontSize: 13, fontWeight: '700', color: c.text },
  eventBody: { flex: 1, paddingVertical: 12, paddingRight: 4 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: c.text },
  eventOrganizer: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  dimText: { color: c.textFaint },
  eventRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSunken,
  },
  bellBtnActive: { backgroundColor: c.primary + '18' },

  // Recurring banner
  recurringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.primary + '14',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: c.primary + '30',
  },
  recurringEmoji: { fontSize: 20 },
  recurringTitle: { fontSize: 13, fontWeight: '700', color: c.text },
  recurringDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  // Sports
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.mode === 'dark' ? 'rgba(33,150,243,0.15)' : '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: c.mode === 'dark' ? '#90CAF9' : '#1565C0' },
  chipRow: { marginTop: 12, marginBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  chipTextActive: { color: c.onPrimary },
  dayHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: c.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    gap: 10,
  },
  sportCardGoing: {
    borderWidth: 1.5,
    borderColor: c.primary + '50',
    backgroundColor: c.primary + '06',
  },
  sportEmoji: { fontSize: 28 },
  sportBody: { flex: 1 },
  sportName: { fontSize: 15, fontWeight: '600', color: c.text },
  sportInstructor: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  sportNote: { fontSize: 11, color: c.warning, marginTop: 2 },
  sportRight: { alignItems: 'flex-end', gap: 6 },
  timePill: {
    backgroundColor: c.surfaceSunken,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: { fontSize: 11, fontWeight: '700', color: c.text },
  locationBadge: {
    backgroundColor: c.mode === 'dark' ? 'rgba(76,175,80,0.18)' : '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pitchBadge: { backgroundColor: c.mode === 'dark' ? 'rgba(255,152,0,0.18)' : '#FFF3E0' },
  locationText: { fontSize: 11, fontWeight: '600', color: c.mode === 'dark' ? '#A5D6A7' : '#2E7D32' },
  pitchText: { color: c.mode === 'dark' ? '#FFB74D' : '#E65100' },

  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: c.textMuted,
    marginTop: 20,
    fontStyle: 'italic',
  },
});
