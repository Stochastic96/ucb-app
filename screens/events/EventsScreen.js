import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import SearchBar from '../../components/SearchBar';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, CATEGORY_COLORS } from '../../constants/colors';
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


function EventCard({ ev, isGoing, onToggle }) {
  const color = CATEGORY_COLORS[ev.category] ?? PRIMARY;
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
          <View style={[styles.badge, { backgroundColor: PRIMARY }]}>
            <Text style={styles.badgeText}>TODAY</Text>
          </View>
        )}
        {!past && !today && days !== null && days <= 7 && (
          <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.badgeText}>
              {days === 1 ? 'Tomorrow' : `${days}d`}
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
              color={isGoing ? PRIMARY : INACTIVE}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RecurringBanner({ campusEvents }) {
  const rec = campusEvents.find((event) => isCampusEventRecurring(event));
  if (!rec) return null;
  return (
    <View style={styles.recurringBanner}>
      <Text style={styles.recurringEmoji}>🔁</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.recurringTitle}>Every {rec.recurringDay} at {rec.time}</Text>
        <Text style={styles.recurringDesc}>{rec.title} — {rec.organizer}</Text>
      </View>
    </View>
  );
}

function CampusEventsTab({ campusEvents, goingEventIds, onToggleEvent, onRefresh, refreshing }) {
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

  const sections = useMemo(() => buildCampusEventSections(filtered), [filtered]);

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
              placeholder="Search events, organizer…"
            />
          </View>
          {!query.trim() && <RecurringBanner campusEvents={campusEvents} />}
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
        />
      )}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      ListEmptyComponent={<Text style={styles.emptyText}>No campus events are available right now.</Text>}
      ListFooterComponent={
        <Text style={styles.footerNote}>
          Changes possible — follow KADU on Instagram for updates.
        </Text>
      }
    />
  );
}

function SportCard({ item, isGoing, onToggle }) {
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
            color={isGoing ? PRIMARY : INACTIVE}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SportsTab({ sportsData, goingSportIds, onToggleSport, onRefresh, refreshing }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const availableDays = useMemo(
    () => DAY_ORDER.filter((day) => sportsData.some((entry) => normalizeDayName(entry.day) === day)),
    [sportsData]
  );
  const dayOptions = useMemo(() => ['All', ...availableDays], [availableDays]);

  useEffect(() => {
    const today = getCurrentDayName();
    const fallbackDay = availableDays.includes(today) ? today : 'All';

    if (selectedDay === null) {
      setSelectedDay(fallbackDay);
      return;
    }

    if (selectedDay !== 'All' && !availableDays.includes(selectedDay)) {
      setSelectedDay(fallbackDay);
    }
  }, [availableDays, selectedDay]);

  const activeDay = selectedDay ?? 'All';

  const filtered = useMemo(
    () => (
      activeDay === 'All'
        ? sortSportsEntries(sportsData)
        : sortSportsEntries(sportsData.filter((item) => normalizeDayName(item.day) === activeDay))
    ),
    [activeDay, sportsData]
  );

  const grouped = useMemo(() => {
    if (activeDay !== 'All') return null;
    return groupSportsByDay(sportsData);
  }, [activeDay, sportsData]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
    >
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#1565C0" />
        <Text style={styles.infoText}>
          Free to join — no registration needed. Tap the bell to set a weekly reminder.
        </Text>
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
        <Text style={styles.emptyText}>No sports sessions are available for this day.</Text>
      )}

      <Text style={styles.footerNote}>
        Sports schedule valid from 23.03.2026. Hall: Umwelt-Campus Birkenfeld.
      </Text>
    </ScrollView>
  );
}

export default function EventsScreen() {
  const navigation = useNavigation();
  const parentNav = navigation.getParent();
  const canGoBack = parentNav?.canGoBack() ?? false;

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
  const setGoingEventIds = useStore((s) => s.setGoingEventIds);
  const setGoingSportIds = useStore((s) => s.setGoingSportIds);

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
      removeGoingEvent(ev.id);
      await cancelReminder(`event_${ev.id}`);
      const next = goingEventIds.filter((x) => x !== ev.id);
      await saveGoingState(next, goingSportIds);
    } else {
      const ok = await scheduleEventReminder(ev);
      if (ok === false && !isCampusEventPast(ev)) {
        // permission denied
        Alert.alert(
          'Notifications disabled',
          'Enable notifications in Settings to get reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      addGoingEvent(ev.id);
      const next = [...goingEventIds, ev.id];
      await saveGoingState(next, goingSportIds);
      if (ok) {
        Alert.alert('Reminder set!', `You'll get a reminder the morning of ${ev.title}.`, [{ text: 'OK' }]);
      }
    }
  }, [goingEventIds, goingSportIds]);

  const handleToggleSport = useCallback(async (sport) => {
    const going = goingSportIds.includes(sport.id);
    if (going) {
      removeGoingSport(sport.id);
      await cancelReminder(`sport_${sport.id}`);
      const next = goingSportIds.filter((x) => x !== sport.id);
      await saveGoingState(goingEventIds, next);
    } else {
      const ok = await scheduleSportReminder(sport);
      if (ok === false) {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications in Settings to get reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      addGoingSport(sport.id);
      const next = [...goingSportIds, sport.id];
      await saveGoingState(goingEventIds, next);
      Alert.alert(
        'Weekly reminder set!',
        `You'll be reminded 30 min before ${sport.sport} every ${sport.day}.`,
        [{ text: 'OK' }]
      );
    }
  }, [goingEventIds, goingSportIds]);

  const goingCount = goingEventIds.length + goingSportIds.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {canGoBack && (
            <TouchableOpacity
              onPress={() => parentNav.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
            </TouchableOpacity>
          )}
          <Text style={styles.screenTitle}>Events</Text>
        </View>
        {goingCount > 0 && (
          <View style={styles.goingPill}>
            <Ionicons name="notifications" size={13} color="#fff" />
            <Text style={styles.goingPillText}>{goingCount} reminder{goingCount > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'events' && styles.tabBtnActive]}
          onPress={() => setActiveTab('events')}
        >
          <Ionicons name="calendar-outline" size={16} color={activeTab === 'events' ? PRIMARY : INACTIVE} />
          <Text style={[styles.tabBtnText, activeTab === 'events' && styles.tabBtnTextActive]}>
            Campus Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'sports' && styles.tabBtnActive]}
          onPress={() => setActiveTab('sports')}
        >
          <Ionicons name="basketball-outline" size={16} color={activeTab === 'sports' ? PRIMARY : INACTIVE} />
          <Text style={[styles.tabBtnText, activeTab === 'sports' && styles.tabBtnTextActive]}>
            Sports
          </Text>
          {goingSportIds.length > 0 && (
            <View style={styles.tabCountDot}>
              <Text style={styles.tabCountDotText}>{goingSportIds.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        {loadingContent ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>Loading campus content...</Text>
          </View>
        ) : contentError ? (
          <ScrollView
            contentContainerStyle={styles.errorState}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadContent(true)} tintColor={PRIMARY} />
            }
          >
            <Ionicons name="cloud-offline-outline" size={48} color="#CCC" />
            <Text style={styles.errorTitle}>Couldn't load events</Text>
            <Text style={styles.errorSub}>Pull down to retry, or check your connection.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadContent()}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : activeTab === 'events' ? (
          <CampusEventsTab
            campusEvents={campusEvents}
            goingEventIds={goingEventIds}
            onToggleEvent={handleToggleEvent}
            onRefresh={() => loadContent(true)}
            refreshing={refreshing}
          />
        ) : (
          <SportsTab
            sportsData={sportsData}
            goingSportIds={goingSportIds}
            onToggleSport={handleToggleSport}
            onRefresh={() => loadContent(true)}
            refreshing={refreshing}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  eventsSearchWrapper: { paddingVertical: 10 },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { padding: 2 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  goingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  goingPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SURFACE,
  },
  tabBtnActive: { backgroundColor: PRIMARY + '18' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: INACTIVE },
  tabBtnTextActive: { color: PRIMARY },
  tabCountDot: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountDotText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Event cards
  monthHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 14, color: INACTIVE, fontWeight: '500' },
  errorState: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 80 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  errorSub: { fontSize: 14, color: INACTIVE, textAlign: 'center', lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText: { color: INACTIVE, fontSize: 14, marginTop: 24, marginBottom: 8 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  eventCardPast: { opacity: 0.45 },
  eventBorder: { width: 4, alignSelf: 'stretch' },
  eventDateBox: { paddingHorizontal: 12, paddingVertical: 14, minWidth: 64 },
  eventDate: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  eventBody: { flex: 1, paddingVertical: 12, paddingRight: 4 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  eventOrganizer: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  dimText: { color: '#999' },
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
    backgroundColor: SURFACE,
  },
  bellBtnActive: { backgroundColor: PRIMARY + '18' },

  // Recurring banner
  recurringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PRIMARY + '14',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  recurringEmoji: { fontSize: 20 },
  recurringTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  recurringDesc: { fontSize: 12, color: INACTIVE, marginTop: 2 },

  // Sports
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1565C0' },
  chipRow: { marginTop: 12, marginBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BG,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: INACTIVE },
  chipTextActive: { color: '#fff' },
  dayHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    gap: 10,
  },
  sportCardGoing: {
    borderWidth: 1.5,
    borderColor: PRIMARY + '50',
    backgroundColor: PRIMARY + '06',
  },
  sportEmoji: { fontSize: 28 },
  sportBody: { flex: 1 },
  sportName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  sportInstructor: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  sportNote: { fontSize: 11, color: '#F57C00', marginTop: 2 },
  sportRight: { alignItems: 'flex-end', gap: 6 },
  timePill: {
    backgroundColor: SURFACE,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },
  locationBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pitchBadge: { backgroundColor: '#FFF3E0' },
  locationText: { fontSize: 11, fontWeight: '600', color: '#2E7D32' },
  pitchText: { color: '#E65100' },

  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: INACTIVE,
    marginTop: 20,
    fontStyle: 'italic',
  },
});
