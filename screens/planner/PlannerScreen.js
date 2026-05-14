import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store/useStore';
import { loadDeadlines, saveDeadlines, cancelDeadlineReminders } from '../../services/reminders';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ERROR, ACCENT, BORDER } from '../../constants/colors';

const CATEGORY_META = {
  academic:     { label: 'Academic',     color: PRIMARY,    icon: 'school-outline' },
  bureaucratic: { label: 'Bureaucratic', color: '#E65100',  icon: 'document-text-outline' },
  personal:     { label: 'Personal',     color: '#7B1FA2',  icon: 'person-outline' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'academic', label: 'Academic' },
  { key: 'bureaucratic', label: 'Bureaucratic' },
  { key: 'personal', label: 'Personal' },
];

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

function formatDueDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-DE', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-DE', { hour: '2-digit', minute: '2-digit' });
}

function UrgencyBadge({ days, done }) {
  if (done) return (
    <View style={[styles.badge, { backgroundColor: '#F5F5F5' }]}>
      <Text style={[styles.badgeText, { color: INACTIVE }]}>Done</Text>
    </View>
  );
  if (days < 0) return (
    <View style={[styles.badge, { backgroundColor: '#FFEBEE' }]}>
      <Text style={[styles.badgeText, { color: ERROR }]}>Overdue</Text>
    </View>
  );
  if (days === 0) return (
    <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
      <Text style={[styles.badgeText, { color: '#E65100', fontWeight: '800' }]}>Today</Text>
    </View>
  );
  if (days <= 2) return (
    <View style={[styles.badge, { backgroundColor: '#FBE9E7' }]}>
      <Text style={[styles.badgeText, { color: '#BF360C', fontWeight: '700' }]}>{days}d</Text>
    </View>
  );
  if (days <= 7) return (
    <View style={[styles.badge, { backgroundColor: '#FFF8E1' }]}>
      <Text style={[styles.badgeText, { color: '#F57F17' }]}>{days}d</Text>
    </View>
  );
  return (
    <View style={[styles.badge, { backgroundColor: ACCENT }]}>
      <Text style={[styles.badgeText, { color: DARK }]}>{days}d</Text>
    </View>
  );
}

export default function PlannerScreen({ navigation }) {
  const deadlines = useStore((s) => s.deadlines);
  const setDeadlines = useStore((s) => s.setDeadlines);
  const updateDeadline = useStore((s) => s.updateDeadline);
  const removeDeadline = useStore((s) => s.removeDeadline);
  const [filter, setFilter] = useState('all');

  useFocusEffect(useCallback(() => {
    loadDeadlines().then(setDeadlines);
  }, []));

  const toggleDone = useCallback(async (id, current) => {
    updateDeadline(id, { completed: !current });
    const next = deadlines.map((d) => d.id === id ? { ...d, completed: !current } : d);
    await saveDeadlines(next);
    if (!current) await cancelDeadlineReminders(id);
  }, [deadlines]);

  const confirmDelete = (id, title) => {
    Alert.alert('Delete deadline?', `"${title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelDeadlineReminders(id);
          removeDeadline(id);
          const next = deadlines.filter((d) => d.id !== id);
          await saveDeadlines(next);
        },
      },
    ]);
  };

  const sorted = [...deadlines].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const visible = filter === 'all' ? sorted : sorted.filter((d) => d.category === filter);

  if (deadlines.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle-outline" size={56} color={BORDER} />
        <Text style={styles.emptyTitle}>No deadlines yet</Text>
        <Text style={styles.emptySub}>Track your portfolio, presentations, and assignments</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddDeadline')} accessibilityLabel="Add deadline" accessibilityRole="button">
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Deadline</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const meta = CATEGORY_META[f.key];
          const activeColor = meta ? meta.color : PRIMARY;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
              accessibilityLabel={`Filter by ${f.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {meta && (
                <View style={[styles.filterDot, { backgroundColor: active ? '#fff' : meta.color }]} />
              )}
              <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[styles.list, visible.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>No {filter} deadlines</Text>
          </View>
        }
        renderItem={({ item: d }) => {
          const catMeta = d.category ? CATEGORY_META[d.category] : null;
          return (
            <View style={[styles.card, d.completed && styles.cardDone]}>
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => toggleDone(d.id, d.completed)}
                hitSlop={8}
                accessibilityLabel={d.completed ? 'Mark as not done' : 'Mark as done'}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: d.completed }}
              >
                <Ionicons
                  name={d.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={d.completed ? PRIMARY : BORDER}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => navigation.navigate('AddDeadline', { deadline: d })}
                activeOpacity={0.7}
                accessibilityLabel={`Edit deadline: ${d.title}`}
                accessibilityRole="button"
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, d.completed && styles.strikethrough]} numberOfLines={2}>
                    {d.title}
                  </Text>
                  <UrgencyBadge days={daysUntil(d.dueDate)} done={d.completed} />
                </View>
                <View style={styles.metaRow}>
                  {catMeta && (
                    <View style={[styles.categoryPill, { backgroundColor: catMeta.color + '18', borderColor: catMeta.color + '40' }]}>
                      <View style={[styles.categoryDot, { backgroundColor: catMeta.color }]} />
                      <Text style={[styles.categoryPillText, { color: catMeta.color }]}>{catMeta.label}</Text>
                    </View>
                  )}
                  {d.subject ? (
                    <Text style={styles.subject} numberOfLines={1}>{d.subject}</Text>
                  ) : null}
                </View>
                <Text style={styles.dueDate}>{formatDueDate(d.dueDate)}</Text>
                {d.note ? <Text style={styles.note} numberOfLines={2}>{d.note}</Text> : null}
                <View style={styles.reminders}>
                  {d.remind24h && <ReminderPill label="24h before" />}
                  {d.remind2h && <ReminderPill label="2h before" />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(d.id, d.title)}
                hitSlop={8}
                accessibilityLabel={`Delete deadline: ${d.title}`}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={18} color={INACTIVE} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDeadline')}
        activeOpacity={0.85}
        accessibilityLabel="Add deadline"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function ReminderPill({ label }) {
  return (
    <View style={styles.reminderPill}>
      <Ionicons name="notifications-outline" size={10} color={PRIMARY} />
      <Text style={styles.reminderPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  filterBar: { flexGrow: 0, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: BG,
  },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterChipText: { fontSize: 13, fontWeight: '600', color: INACTIVE },
  list: { padding: 12, paddingBottom: 100 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE, padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: INACTIVE, textAlign: 'center', lineHeight: 20 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyFilter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyFilterText: { fontSize: 15, color: INACTIVE },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BG,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDone: { opacity: 0.55 },
  checkBtn: { paddingTop: 2 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A1A', lineHeight: 22 },
  strikethrough: { textDecorationLine: 'line-through', color: INACTIVE },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryPillText: { fontSize: 11, fontWeight: '700' },
  subject: { fontSize: 13, color: PRIMARY, fontWeight: '600', flexShrink: 1 },
  dueDate: { fontSize: 12, color: INACTIVE, marginBottom: 4 },
  note: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 6 },
  reminders: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  reminderPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ACCENT, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  reminderPillText: { fontSize: 11, color: DARK, fontWeight: '500' },
  deleteBtn: { paddingTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: '600', color: INACTIVE },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
