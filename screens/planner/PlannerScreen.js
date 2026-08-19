import React, { useState, useCallback, useEffect } from 'react';
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
import Tooltip from '../../components/Tooltip';
import useStore from '../../store/useStore';
import { loadDeadlines, saveDeadlines, cancelDeadlineReminders } from '../../services/reminders';
import { enqueueOfflineOp } from '../../services/offlineQueue';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { PLANNER_CATEGORY_COLORS, withAlpha } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

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

function UrgencyBadge({ days, done, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (done) return (
    <View style={[styles.badge, { backgroundColor: c.surfaceSunken }]}>
      <Text style={[styles.badgeText, { color: c.textMuted }]}>{t('planner_badge_done')}</Text>
    </View>
  );
  if (days < 0) return (
    <View style={[styles.badge, { backgroundColor: withAlpha(c.error, '2E') }]}>
      <Text style={[styles.badgeText, { color: c.error }]}>{t('planner_badge_overdue')}</Text>
    </View>
  );
  if (days === 0) return (
    <View style={[styles.badge, { backgroundColor: c.warningSurface }]}>
      <Text style={[styles.badgeText, { color: c.onWarning, fontFamily: c.fonts.bodyBold }]}>{t('planner_badge_today')}</Text>
    </View>
  );
  if (days <= 2) return (
    <View style={[styles.badge, { backgroundColor: c.warningSurface }]}>
      <Text style={[styles.badgeText, { color: c.onWarning, fontFamily: c.fonts.bodyBold }]}>{days}d</Text>
    </View>
  );
  if (days <= 7) return (
    <View style={[styles.badge, { backgroundColor: c.warningSurface }]}>
      <Text style={[styles.badgeText, { color: c.onWarning }]}>{days}d</Text>
    </View>
  );
  return (
    <View style={[styles.badge, { backgroundColor: c.accent }]}>
      <Text style={[styles.badgeText, { color: c.brandIcon }]}>{days}d</Text>
    </View>
  );
}

export default function PlannerScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const deadlines = useStore((s) => s.deadlines);
  const setDeadlines = useStore((s) => s.setDeadlines);
  const updateDeadline = useStore((s) => s.updateDeadline);
  const removeDeadline = useStore((s) => s.removeDeadline);
  const openSidebar = useStore((s) => s.openSidebar);
  const courses = useStore((s) => s.courses);
  const [filter, setFilter] = useState('all');

  const handleFilterChange = (newFilter) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
    }
  };

  const CATEGORY_META = {
    academic:     { labelKey: 'deadline_cat_academic',     color: PLANNER_CATEGORY_COLORS.academic[c.mode],     icon: 'school-outline' },
    bureaucratic: { labelKey: 'deadline_cat_bureaucratic', color: PLANNER_CATEGORY_COLORS.bureaucratic[c.mode], icon: 'document-text-outline' },
    personal:     { labelKey: 'deadline_cat_personal',     color: PLANNER_CATEGORY_COLORS.personal[c.mode],     icon: 'person-outline' },
  };

  const FILTERS = [
    { key: 'all',          labelKey: 'planner_filter_all' },
    { key: 'academic',     labelKey: 'planner_filter_academic' },
    { key: 'bureaucratic', labelKey: 'planner_filter_bureaucratic' },
    { key: 'personal',     labelKey: 'planner_filter_personal' },
  ];

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 4 }}>
          <Tooltip text={t('planner_tooltip')} />
          <TouchableOpacity onPress={openSidebar} hitSlop={12}>
            <Ionicons name="menu" size={24} color={c.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, []);

  useFocusEffect(useCallback(() => {
    loadDeadlines().then(setDeadlines).catch(() => {});
  }, []));

  const toggleDone = useCallback(async (id, current) => {
    const { isOffline } = useStore.getState();
    updateDeadline(id, { completed: !current });
    const next = deadlines.map((d) => d.id === id ? { ...d, completed: !current } : d);
    await saveDeadlines(next);
    if (!current) {
      if (isOffline) {
        enqueueOfflineOp('CANCEL_DEADLINE_REMINDERS', { deadlineId: id });
      } else {
        await cancelDeadlineReminders(id);
      }
    }
  }, [deadlines]);

  const confirmDelete = (id, title) => {
    Alert.alert(t('planner_delete_title'), t('planner_delete_msg', { title }), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'),
        style: 'destructive',
        onPress: async () => {
          const { isOffline } = useStore.getState();
          if (isOffline) {
            enqueueOfflineOp('CANCEL_DEADLINE_REMINDERS', { deadlineId: id });
          } else {
            await cancelDeadlineReminders(id);
          }
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
        <Ionicons name="checkmark-circle-outline" size={56} color={c.border} />
        <Text style={styles.emptyTitle}>{t('planner_empty_title')}</Text>
        <Text style={styles.emptySub}>{t('planner_empty_sub')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddDeadline')} accessibilityRole="button">
          <Ionicons name="add" size={20} color={c.onPrimary} />
          <Text style={styles.addBtnText}>{t('planner_add')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const meta = CATEGORY_META[f.key];
          const activeColor = meta ? meta.color : c.primary;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
              onPress={() => handleFilterChange(f.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {meta && (
                <View style={[styles.filterDot, { backgroundColor: active ? '#fff' : meta.color }]} />
              )}
              <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{t(f.labelKey)}</Text>
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
            <Text style={styles.emptyFilterText}>{t('planner_no_filter', { filter: t(FILTERS.find(f => f.key === filter)?.labelKey ?? 'planner_filter_all').toLowerCase() })}</Text>
          </View>
        }
        renderItem={({ item: d }) => {
          const catMeta = d.category ? CATEGORY_META[d.category] : null;
          const linkedCourse = d.courseId ? courses.find((c) => c.id === d.courseId) : null;
          return (
            <View style={[styles.card, d.completed && styles.cardDone]}>
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => toggleDone(d.id, d.completed)}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: d.completed }}
              >
                <Ionicons
                  name={d.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={d.completed ? c.primary : c.border}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => navigation.navigate('AddDeadline', { deadline: d })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}, ${formatDueDate(d.dueDate)}${d.completed ? `, ${t('planner_badge_done')}` : ''}`}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, d.completed && styles.strikethrough]} numberOfLines={2}>
                    {d.title}
                  </Text>
                  <UrgencyBadge days={daysUntil(d.dueDate)} done={d.completed} t={t} />
                </View>
                <View style={styles.metaRow}>
                  {catMeta && (
                    <View style={[styles.categoryPill, { backgroundColor: catMeta.color + '18', borderColor: catMeta.color + '40' }]}>
                      <View style={[styles.categoryDot, { backgroundColor: catMeta.color }]} />
                      <Text style={[styles.categoryPillText, { color: catMeta.color }]}>{t(catMeta.labelKey)}</Text>
                    </View>
                  )}
                  {d.subject ? (
                    <View style={styles.subjectRow}>
                      {linkedCourse && (
                        <View style={[styles.subjectDot, { backgroundColor: linkedCourse.color ?? c.primary }]} />
                      )}
                      <Text style={styles.subject} numberOfLines={1}>{d.subject}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.dueDate}>{formatDueDate(d.dueDate)}</Text>
                {d.note ? <Text style={styles.note} numberOfLines={2}>{d.note}</Text> : null}
                <View style={styles.reminders}>
                  {d.remind24h && <ReminderPill label={t('planner_reminder_24h')} />}
                  {d.remind2h && <ReminderPill label={t('planner_reminder_2h')} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(d.id, d.title)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('planner_delete_title')}
              >
                <Ionicons name="trash-outline" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDeadline')}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={c.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function ReminderPill({ label }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.reminderPill}>
      <Ionicons name="notifications-outline" size={10} color={c.primary} />
      <Text style={styles.reminderPillText}>{label}</Text>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  filterBar: { flexGrow: 0, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  filterBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterChipText: { ...c.type.label, color: c.textMuted },
  list: { padding: 12, paddingBottom: 100 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, padding: 32, gap: 12 },
  emptyTitle: { ...c.type.titleLg, fontSize: 20, color: c.text },
  emptySub: { ...c.type.bodySm, fontSize: 14, color: c.textMuted, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  addBtnText: { ...c.type.bodyStrong, color: c.onPrimary },
  emptyFilter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyFilterText: { ...c.type.body, color: c.textMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.surface,
    borderRadius: c.radius.lg,
    padding: 12,
    marginBottom: 10,
    gap: 10,
    ...c.shadows.card,
  },
  cardDone: { opacity: 0.55 },
  checkBtn: { paddingTop: 2 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardTitle: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, flex: 1, color: c.text },
  strikethrough: { textDecorationLine: 'line-through', color: c.textMuted },
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
  categoryPillText: { ...c.type.micro },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  subjectDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  subject: { ...c.type.label, color: c.brandIcon, flexShrink: 1 },
  dueDate: { ...c.type.caption, color: c.textMuted, marginBottom: 4 },
  note: { ...c.type.bodySm, color: c.textSecondary, marginBottom: 6 },
  reminders: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  reminderPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.accent, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  reminderPillText: { ...c.type.micro, fontFamily: c.fonts.bodyMedium, color: c.brandIcon },
  deleteBtn: { paddingTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  badgeText: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, color: c.textMuted },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...c.shadows.raised,
  },
});
