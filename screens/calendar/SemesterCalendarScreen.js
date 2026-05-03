import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import calendarData from '../../data/semester_calendar.json';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT, ERROR } from '../../constants/colors';

const CATEGORY_CONFIG = {
  academic:   { color: '#1976D2', bg: '#E3F2FD', label: 'Academic' },
  exams:      { color: '#E65100', bg: '#FBE9E7', label: 'Exams' },
  admin:      { color: '#6A1B9A', bg: '#F3E5F5', label: 'Admin' },
  holiday:    { color: '#2E7D32', bg: '#E8F5E9', label: 'Holiday' },
};

const ALL_CATS = ['academic', 'exams', 'admin', 'holiday'];

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function semesterProgress(sem) {
  const today = Date.now();
  const start = new Date(sem.lectureStart).getTime();
  const end = new Date(sem.lectureEnd).getTime();
  if (today < start) return 0;
  if (today > end) return 1;
  return (today - start) / (end - start);
}

function CountdownChip({ days }) {
  if (days < 0) return (
    <View style={[styles.chip, { backgroundColor: '#F5F5F5' }]}>
      <Text style={[styles.chipText, { color: INACTIVE }]}>Done</Text>
    </View>
  );
  if (days === 0) return (
    <View style={[styles.chip, { backgroundColor: '#FFF3E0' }]}>
      <Text style={[styles.chipText, { color: '#E65100', fontWeight: '800' }]}>Today</Text>
    </View>
  );
  if (days <= 7) return (
    <View style={[styles.chip, { backgroundColor: '#FBE9E7' }]}>
      <Text style={[styles.chipText, { color: '#BF360C', fontWeight: '700' }]}>{days}d</Text>
    </View>
  );
  if (days <= 30) return (
    <View style={[styles.chip, { backgroundColor: '#FFF8E1' }]}>
      <Text style={[styles.chipText, { color: '#F57F17', fontWeight: '600' }]}>{days}d</Text>
    </View>
  );
  return (
    <View style={[styles.chip, { backgroundColor: ACCENT }]}>
      <Text style={[styles.chipText, { color: DARK }]}>{days}d</Text>
    </View>
  );
}

export default function SemesterCalendarScreen() {
  const semester = calendarData.semesters.find((s) => s.id === calendarData.current);
  const [activeFilter, setActiveFilter] = useState('all');

  const progress = useMemo(() => semesterProgress(semester), [semester]);
  const progressPct = Math.round(progress * 100);

  const events = useMemo(() => {
    const filtered = activeFilter === 'all'
      ? semester.events
      : semester.events.filter((e) => e.category === activeFilter);
    return filtered.slice().sort((a, b) => a.date.localeCompare(b.date));
  }, [semester.events, activeFilter]);

  const upcoming = events.filter((e) => daysUntil(e.date) >= 0);
  const past = events.filter((e) => daysUntil(e.date) < 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Semester card */}
      <View style={styles.semCard}>
        <View style={styles.semHeader}>
          <View style={[styles.semBadge, { backgroundColor: semester.color }]}>
            <Text style={styles.semBadgeText}>{semester.shortName}</Text>
          </View>
          <Text style={styles.semName}>{semester.name}</Text>
        </View>
        <Text style={styles.semDates}>
          {formatDate(semester.lectureStart)} — {formatDate(semester.lectureEnd)}
        </Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressPct}% through lectures</Text>
        </View>
      </View>

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {ALL_CATS.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const active = activeFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
              onPress={() => setActiveFilter(cat)}
            >
              <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <>
          <Text style={styles.groupLabel}>Upcoming</Text>
          {upcoming.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </>
      )}

      {/* Past events */}
      {past.length > 0 && (
        <>
          <Text style={[styles.groupLabel, { color: INACTIVE }]}>Past</Text>
          {[...past].reverse().map((ev) => (
            <EventCard key={ev.id} event={ev} past />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function EventCard({ event, past }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.academic;
  const days = daysUntil(event.date);

  return (
    <TouchableOpacity
      style={[styles.eventCard, past && styles.eventCardPast]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={[styles.eventStripe, { backgroundColor: past ? INACTIVE : cfg.color }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.eventTitleRow}>
              {event.important && !past && (
                <Ionicons name="alert-circle" size={16} color={cfg.color} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.eventTitle, past && styles.eventTitlePast]} numberOfLines={expanded ? 0 : 2}>
                {event.title}
              </Text>
            </View>
            <Text style={styles.eventDate}>
              {formatDate(event.date)}
              {event.endDate && event.endDate !== event.date ? ` — ${formatDate(event.endDate)}` : ''}
            </Text>
          </View>
          <CountdownChip days={days} />
        </View>
        <View style={styles.eventMeta}>
          <View style={[styles.catBadge, { backgroundColor: past ? '#F5F5F5' : cfg.bg }]}>
            <Text style={[styles.catBadgeText, { color: past ? INACTIVE : cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {expanded && (
          <Text style={styles.eventDesc}>{event.description}</Text>
        )}
      </View>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={INACTIVE}
        style={{ alignSelf: 'center', marginLeft: 4 }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 40 },
  semCard: {
    margin: 12,
    backgroundColor: BG,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  semHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  semBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  semBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  semName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  semDates: { fontSize: 13, color: INACTIVE, marginBottom: 12 },
  progressRow: { gap: 6 },
  progressTrack: { height: 6, backgroundColor: SURFACE, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: INACTIVE },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: '#DCDCDC',
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 13, color: INACTIVE, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: BG,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    paddingRight: 12,
  },
  eventCardPast: { opacity: 0.6 },
  eventStripe: { width: 4 },
  eventBody: { flex: 1, padding: 12 },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  eventTitlePast: { color: INACTIVE },
  eventDate: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  eventMeta: { flexDirection: 'row', marginTop: 8, gap: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  eventDesc: { fontSize: 13, color: '#444', marginTop: 10, lineHeight: 19 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 40, alignItems: 'center' },
  chipText: { fontSize: 12, fontWeight: '600' },
});
