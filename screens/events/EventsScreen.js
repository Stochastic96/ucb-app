import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER } from '../../constants/colors';
import campusEvents from '../../data/events_campus.json';
import sportsData from '../../data/events_sports.json';
import useStore from '../../store/useStore';
import {
  loadGoingState,
  saveGoingState,
  scheduleEventReminder,
  scheduleSportReminder,
  cancelReminder,
} from '../../services/reminders';

const CATEGORY_COLORS = {
  party: '#E91E63',
  gaming: '#7B1FA2',
  social: '#1976D2',
  academic: '#455A64',
  sports: '#388E3C',
  outdoor: '#F57C00',
  cultural: '#D84315',
  culture: '#00796B',
  recurring: PRIMARY,
};

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

const MONTH_LABELS = {
  '03': 'März', '04': 'April', '05': 'Mai',
  '06': 'Juni', '07': 'Juli',
};

const DAYS = ['All', 'Monday', 'Wednesday', 'Thursday'];
const JS_DAY_MAP = { 1: 'Monday', 3: 'Wednesday', 4: 'Thursday' };

function todayDayFilter() {
  return JS_DAY_MAP[new Date().getDay()] ?? null;
}

function formatDate(dateStr, endDateStr) {
  if (!dateStr) return '';
  const [, m, dd] = dateStr.split('-');
  if (endDateStr) {
    const [, , dd2] = endDateStr.split('-');
    return `${dd}.${m}–${dd2}.${m}`;
  }
  return `${dd}.${m}`;
}

function isPast(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

function buildSections() {
  const oneTime = campusEvents.filter((e) => !e.recurringDay);
  const byMonth = {};
  for (const ev of oneTime) {
    const month = ev.date.split('-')[1];
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(ev);
  }
  return Object.keys(byMonth)
    .sort()
    .map((m) => ({
      title: MONTH_LABELS[m] ?? m,
      data: byMonth[m].sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

function EventCard({ ev, isGoing, onToggle }) {
  const color = CATEGORY_COLORS[ev.category] ?? PRIMARY;
  const past = isPast(ev.date);
  const today = isToday(ev.date);
  const days = ev.date ? daysUntil(ev.date) : null;

  return (
    <View style={[styles.eventCard, past && styles.eventCardPast]}>
      <View style={[styles.eventBorder, { backgroundColor: color }]} />
      <View style={styles.eventDateBox}>
        <Text style={[styles.eventDate, past && styles.dimText]}>
          {formatDate(ev.date, ev.endDate)}
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

function RecurringBanner() {
  const rec = campusEvents.find((e) => e.recurringDay);
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

function CampusEventsTab({ goingEventIds, onToggleEvent }) {
  const sections = useMemo(() => buildSections(), []);
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      ListHeaderComponent={<RecurringBanner />}
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

function SportsTab({ goingSportIds, onToggleSport }) {
  const defaultDay = todayDayFilter();
  const [selectedDay, setSelectedDay] = useState(defaultDay ?? 'All');

  const filtered = useMemo(
    () => (selectedDay === 'All' ? sportsData : sportsData.filter((s) => s.day === selectedDay)),
    [selectedDay]
  );

  const grouped = useMemo(() => {
    if (selectedDay !== 'All') return null;
    const byDay = {};
    for (const s of sportsData) {
      if (!byDay[s.day]) byDay[s.day] = [];
      byDay[s.day].push(s);
    }
    return byDay;
  }, [selectedDay]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#1565C0" />
        <Text style={styles.infoText}>
          Free to join — no registration needed. Tap the bell to set a weekly reminder.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, selectedDay === d && styles.chipActive]}
            onPress={() => setSelectedDay(d)}
          >
            <Text style={[styles.chipText, selectedDay === d && styles.chipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {grouped
        ? Object.entries(grouped).map(([day, items]) => (
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

  const goingEventIds = useStore((s) => s.goingEventIds);
  const goingSportIds = useStore((s) => s.goingSportIds);
  const addGoingEvent = useStore((s) => s.addGoingEvent);
  const removeGoingEvent = useStore((s) => s.removeGoingEvent);
  const addGoingSport = useStore((s) => s.addGoingSport);
  const removeGoingSport = useStore((s) => s.removeGoingSport);
  const setGoingEventIds = useStore((s) => s.setGoingEventIds);
  const setGoingSportIds = useStore((s) => s.setGoingSportIds);

  // Load persisted going state on mount
  useEffect(() => {
    loadGoingState().then(({ goingEventIds: eIds, goingSportIds: sIds }) => {
      setGoingEventIds(eIds);
      setGoingSportIds(sIds);
    });
  }, []);

  const handleToggleEvent = useCallback(async (ev) => {
    const going = goingEventIds.includes(ev.id);
    if (going) {
      removeGoingEvent(ev.id);
      await cancelReminder(`event_${ev.id}`);
      const next = goingEventIds.filter((x) => x !== ev.id);
      await saveGoingState(next, goingSportIds);
    } else {
      const ok = await scheduleEventReminder(ev);
      if (ok === false && !isPast(ev.date)) {
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
        {activeTab === 'events' ? (
          <CampusEventsTab goingEventIds={goingEventIds} onToggleEvent={handleToggleEvent} />
        ) : (
          <SportsTab goingSportIds={goingSportIds} onToggleSport={handleToggleSport} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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
