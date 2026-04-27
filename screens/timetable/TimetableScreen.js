import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAllEvents } from '../../services/events';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG, BORDER } from '../../constants/colors';

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 5; // show Mon–Fri by default

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoToMinutes(isoString) {
  if (!isoString) return null;
  const d = new Date(parseInt(isoString, 10) * 1000 || isoString);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(parseInt(isoString, 10) * 1000 || isoString);
  return d.toLocaleTimeString('en-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function sameDay(isoString, date) {
  if (!isoString) return false;
  const d = new Date(parseInt(isoString, 10) * 1000 || isoString);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function formatDayHeader(date) {
  return date.toLocaleDateString('en-DE', { weekday: 'short', day: 'numeric' });
}

export default function TimetableScreen({ navigation }) {
  const events = useStore((s) => s.events);
  const courses = useStore((s) => s.courses);
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(events.length === 0);

  useEffect(() => {
    if (events.length === 0 && courses.length > 0) {
      fetchAllEvents(courses).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [courses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllEvents(courses);
    setRefreshing(false);
  };

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const eventsInWeek = events.filter((e) =>
    weekDays.some((day) => sameDay(e.start, day))
  );

  const navigateToBuilding = (buildingId) => {
    if (buildingId) {
      useStore.getState().setPendingMapBuilding(buildingId);
      navigation.getParent()?.navigate('Map');
    }
    setSelected(null);
  };

  return (
    <View style={styles.container}>
      {/* Week navigation header */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {weekStart.toLocaleDateString('en-DE', { day: 'numeric', month: 'short' })}
          {' – '}
          {addDays(weekStart, 4).toLocaleDateString('en-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        <View style={styles.timeGutter} />
        {weekDays.map((day, i) => {
          const isToday = sameDay(day.toISOString(), new Date());
          return (
            <View key={i} style={[styles.dayHeaderCell, { width: COLUMN_WIDTH }]}>
              <Text style={[styles.dayHeaderText, isToday && styles.dayHeaderToday]}>
                {formatDayHeader(day)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Time grid */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        <View style={styles.grid}>
          {/* Hour labels */}
          <View style={styles.timeGutter}>
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <View key={i} style={[styles.hourLabel, { height: HOUR_HEIGHT }]}>
                <Text style={styles.hourText}>{String(START_HOUR + i).padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const dayEvents = eventsInWeek.filter((e) => sameDay(e.start, day));
            return (
              <View key={di} style={[styles.dayColumn, { width: COLUMN_WIDTH }]}>
                {/* Hour grid lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <View key={i} style={[styles.hourCell, { height: HOUR_HEIGHT }]} />
                ))}

                {/* Event blocks */}
                {dayEvents.map((event) => {
                  const startMins = isoToMinutes(event.start);
                  const endMins = isoToMinutes(event.end) ?? (startMins + 90);
                  if (startMins === null) return null;
                  const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 20);
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[styles.eventBlock, { top, height, backgroundColor: event.courseColor }]}
                      onPress={() => setSelected(event)}
                    >
                      <Text style={styles.eventTitle} numberOfLines={2}>{event.courseTitle}</Text>
                      {!!event.room && <Text style={styles.eventRoom} numberOfLines={1}>{event.room}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Event detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            {selected && (
              <>
                <View style={[styles.sheetAccent, { backgroundColor: selected.courseColor }]} />
                <Text style={styles.sheetCourse}>{selected.courseTitle}</Text>
                <Text style={styles.sheetTime}>
                  {formatTime(selected.start)} – {formatTime(selected.end)}
                </Text>
                {!!selected.room && (
                  <Text style={styles.sheetDetail}>
                    <Ionicons name="location-outline" size={14} color={INACTIVE} /> Room {selected.room}
                    {selected.building ? `, Building ${selected.building}` : ''}
                  </Text>
                )}
                {!!selected.professorName && (
                  <Text style={styles.sheetDetail}>
                    <Ionicons name="person-outline" size={14} color={INACTIVE} /> {selected.professorName}
                  </Text>
                )}
                {!!selected.buildingId && (
                  <TouchableOpacity
                    style={styles.navigateBtn}
                    onPress={() => navigateToBuilding(selected.buildingId)}
                  >
                    <Ionicons name="navigate-outline" size={16} color="#fff" />
                    <Text style={styles.navigateBtnText}>Navigate to Building</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  navBtn: { padding: 8 },
  weekLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  dayHeaders: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  timeGutter: { width: 44 },
  dayHeaderCell: { paddingVertical: 8, alignItems: 'center' },
  dayHeaderText: { fontSize: 11, color: INACTIVE },
  dayHeaderToday: { color: PRIMARY, fontWeight: '700' },
  grid: { flexDirection: 'row' },
  hourLabel: { justifyContent: 'flex-start', paddingTop: 2, paddingRight: 4, alignItems: 'flex-end' },
  hourText: { fontSize: 10, color: INACTIVE },
  dayColumn: { borderLeftWidth: 1, borderLeftColor: BORDER, position: 'relative' },
  hourCell: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  eventBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    padding: 3,
    overflow: 'hidden',
    opacity: 0.9,
  },
  eventTitle: { fontSize: 9, fontWeight: '700', color: '#fff' },
  eventRoom: { fontSize: 8, color: 'rgba(255,255,255,0.85)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetAccent: { height: 4, borderRadius: 2, marginBottom: 16, width: 48, alignSelf: 'center' },
  sheetCourse: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  sheetTime: { fontSize: 15, color: PRIMARY, fontWeight: '600', marginBottom: 12 },
  sheetDetail: { fontSize: 14, color: '#444', marginBottom: 8, lineHeight: 22 },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
    justifyContent: 'center',
  },
  navigateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
