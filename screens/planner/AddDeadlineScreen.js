import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SimpleDatePicker, SimpleTimePicker } from '../../components/SimpleDatePicker';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store/useStore';
import { trackEvent } from '../../services/analytics';
import { enqueueOfflineOp } from '../../services/offlineQueue';
import {
  scheduleDeadlineReminders,
  cancelDeadlineReminders,
  saveDeadlines,
} from '../../services/reminders';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ERROR, BORDER, ACCENT } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getCurrentSemesterCourses(courses) {
  if (!courses.length) return [];
  const counts = {};
  courses.forEach((c) => { if (c.semester) counts[c.semester] = (counts[c.semester] || 0) + 1; });
  const current = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return current ? courses.filter((c) => c.semester === current) : courses.slice(0, 15);
}

export default function AddDeadlineScreen({ navigation, route }) {
  const t = useTranslation();
  const existing = route.params?.deadline;
  const courses = useStore((s) => s.courses);
  const addDeadline = useStore((s) => s.addDeadline);
  const updateDeadline = useStore((s) => s.updateDeadline);
  const deadlines = useStore((s) => s.deadlines);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [linkedCourseId, setLinkedCourseId] = useState(existing?.courseId ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'academic');
  const [dueDate, setDueDate] = useState(existing ? new Date(existing.dueDate) : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  })());
  // Handle backward compatibility: old deadlines have remind24h, map to remindOnTime
  const [remind2h, setRemind2h] = useState(existing?.remind2h ?? true);
  const [remindOnTime, setRemindOnTime] = useState(existing?.remindOnTime ?? existing?.remind24h ?? false);
  const [subjectFocused, setSubjectFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const CATEGORIES = [
    { key: 'academic',     labelKey: 'deadline_cat_academic',     color: PRIMARY,   icon: 'school-outline' },
    { key: 'bureaucratic', labelKey: 'deadline_cat_bureaucratic', color: '#E65100', icon: 'document-text-outline' },
    { key: 'personal',     labelKey: 'deadline_cat_personal',     color: '#7B1FA2', icon: 'person-outline' },
  ];

  const semesterCourses = useMemo(() => getCurrentSemesterCourses(courses), [courses]);

  const academicMatches = useMemo(() => {
    if (!subjectFocused || category !== 'academic') return [];
    const q = subject.trim().toLowerCase();
    return q.length === 0
      ? semesterCourses
      : semesterCourses.filter((c) => c.title.toLowerCase().includes(q));
  }, [subjectFocused, category, subject, semesterCourses]);

  const textSuggestions = useMemo(() => {
    if (category === 'academic' || !subjectFocused || subject.length === 0) return [];
    return courses
      .map((c) => c.title)
      .filter(Boolean)
      .filter((n) => n.toLowerCase().includes(subject.toLowerCase()))
      .slice(0, 4);
  }, [category, subjectFocused, subject, courses]);

  const linkedCourse = linkedCourseId ? courses.find((c) => c.id === linkedCourseId) : null;

  const selectCourse = (course) => {
    setSubject(course.title);
    setLinkedCourseId(course.id);
    setSubjectFocused(false);
  };

  const handleSubjectChange = (text) => {
    setSubject(text);
    if (linkedCourseId && text !== linkedCourse?.title) {
      setLinkedCourseId(null);
    }
  };

  const handleCategoryChange = (key) => {
    setCategory(key);
    if (key !== 'academic') setLinkedCourseId(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('deadline_title_required_title'), t('deadline_title_required_msg'));
      return;
    }
    setSaving(true);
    try {
      const deadline = {
        id: existing?.id ?? uid(),
        title: title.trim(),
        subject: subject.trim(),
        courseId: linkedCourseId ?? null,
        note: note.trim(),
        category,
        dueDate: dueDate.toISOString(),
        remind2h,
        remindOnTime,
        completed: existing?.completed ?? false,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      const { isOffline } = useStore.getState();

      if (existing) {
        if (isOffline) {
          enqueueOfflineOp('CANCEL_DEADLINE_REMINDERS', { deadlineId: existing.id });
        } else {
          await cancelDeadlineReminders(existing.id);
        }
      }

      if (!deadline.completed) {
        // Check if notifications are enabled in app settings
        const { settings } = useStore.getState();
        if (!settings.notificationsEnabled) {
          Alert.alert(
            t('deadline_notif_permission_title'),
            t('deadline_notif_disabled_msg')
          );
          // Still save deadline, just no reminders scheduled
        } else if (isOffline) {
          enqueueOfflineOp('SCHEDULE_DEADLINE_REMINDERS', { deadline });
        } else {
          await scheduleDeadlineReminders(deadline);
        }
      }

      if (existing) {
        const next = deadlines.map((d) => d.id === existing.id ? deadline : d);
        await saveDeadlines(next);
        updateDeadline(existing.id, deadline);
      } else {
        await saveDeadlines([deadline, ...deadlines]);
        addDeadline(deadline);
        trackEvent('feature_use', 'deadline_added');
      }

      navigation.goBack();
    } catch {
      Alert.alert(t('common_error'), t('deadline_error_msg'));
    } finally {
      setSaving(false);
    }
  };

  const subjectLabel = category === 'academic' ? t('deadline_course_label') : t('deadline_subject_label');
  const subjectPlaceholder = category === 'academic'
    ? (semesterCourses.length > 0 ? t('deadline_course_placeholder') : t('deadline_subject_academic_placeholder'))
    : t('deadline_subject_other_placeholder');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Title */}
      <FormSection label={t('deadline_title_label')}>
        <TextInput
          style={styles.input}
          placeholder={t('deadline_title_placeholder')}
          placeholderTextColor={INACTIVE}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          autoFocus={!existing}
        />
      </FormSection>

      {/* Category */}
      <FormSection label={t('deadline_category')}>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => handleCategoryChange(cat.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={cat.icon} size={14} color={active ? '#fff' : INACTIVE} />
                <Text style={[styles.categoryChipText, active && { color: '#fff' }]}>{t(cat.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormSection>

      {/* Subject / Course picker */}
      <FormSection label={subjectLabel}>
        {linkedCourse && (
          <View style={[styles.linkedBadge, { borderLeftColor: linkedCourse.color ?? PRIMARY }]}>
            <View style={[styles.linkedDot, { backgroundColor: linkedCourse.color ?? PRIMARY }]} />
            <Text style={styles.linkedText} numberOfLines={1}>{linkedCourse.title}</Text>
            <TouchableOpacity
              onPress={() => { setLinkedCourseId(null); setSubject(''); }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={16} color={INACTIVE} />
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder={subjectPlaceholder}
          placeholderTextColor={INACTIVE}
          value={subject}
          onChangeText={handleSubjectChange}
          onFocus={() => setSubjectFocused(true)}
          onBlur={() => setTimeout(() => setSubjectFocused(false), 180)}
          maxLength={80}
        />

        {academicMatches.length > 0 && (
          <View style={styles.suggestions}>
            <View style={styles.pickerHeader}>
              <Ionicons name="school-outline" size={12} color={PRIMARY} />
              <Text style={styles.pickerHeaderText}>{t('deadline_semester_courses')}</Text>
            </View>
            {academicMatches.map((course) => {
              const selected = linkedCourseId === course.id;
              return (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.courseRow, selected && styles.courseRowSelected]}
                  onPress={() => selectCourse(course)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.courseDot, { backgroundColor: course.color ?? PRIMARY }]} />
                  <Text style={[styles.courseRowText, selected && { color: PRIMARY, fontWeight: '700' }]} numberOfLines={2}>
                    {course.title}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />}
                </TouchableOpacity>
              );
            })}
            {academicMatches.length === 0 && subject.length > 0 && (
              <View style={styles.noMatch}>
                <Text style={styles.noMatchText}>{t('deadline_no_course_match')}</Text>
              </View>
            )}
          </View>
        )}

        {textSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {textSuggestions.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.suggestionRow}
                onPress={() => { setSubject(name); setSubjectFocused(false); }}
                accessibilityRole="button"
              >
                <Ionicons name="book-outline" size={14} color={PRIMARY} />
                <Text style={styles.suggestionText} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </FormSection>

      {/* Due date & time */}
      <FormSection label={t('deadline_due_datetime')}>
        <View style={styles.dateRow}>
          <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#ECECEC' }}>
            <SimpleDatePicker
              value={dueDate}
              onChange={(d) => setDueDate((prev) => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; })}
              minimumDate={new Date()}
              label={t('deadline_due_date')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SimpleTimePicker
              value={dueDate}
              onChange={(d) => setDueDate((prev) => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; })}
              label={t('deadline_due_time')}
            />
          </View>
        </View>
      </FormSection>

      {/* Note */}
      <FormSection label={t('deadline_note_label')}>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder={t('deadline_note_placeholder')}
          placeholderTextColor={INACTIVE}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          multiline
        />
        <Text style={styles.charCount}>{t('deadline_note_count', { count: note.length })}</Text>
      </FormSection>

      {/* Reminders */}
      <FormSection label={t('deadline_reminders')}>
        <ToggleRow
          label={t('deadline_reminder_2h')}
          icon="alarm-outline"
          value={remind2h}
          onToggle={() => setRemind2h((v) => !v)}
        />
        <ToggleRow
          label={t('deadline_reminder_ontime')}
          icon="notifications-outline"
          value={remindOnTime}
          onToggle={() => setRemindOnTime((v) => !v)}
          last
        />
      </FormSection>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Ionicons name={existing ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
        <Text style={styles.saveBtnText}>{existing ? t('deadline_save_changes') : t('deadline_add')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FormSection({ label, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ToggleRow({ icon, label, value, onToggle, last }) {
  return (
    <TouchableOpacity
      style={[styles.toggleRow, !last && styles.toggleRowBorder]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={PRIMARY} />
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: { backgroundColor: BG, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ECECEC' },
  input: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1A1A1A' },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: INACTIVE, textAlign: 'right', paddingRight: 14, paddingBottom: 8 },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    borderLeftWidth: 4,
    backgroundColor: ACCENT,
  },
  linkedDot: { width: 10, height: 10, borderRadius: 5 },
  linkedText: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK },
  suggestions: { borderTopWidth: 1, borderTopColor: '#ECECEC' },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: ACCENT,
  },
  pickerHeaderText: { fontSize: 11, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  courseRowSelected: { backgroundColor: ACCENT },
  courseDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  courseRowText: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  noMatch: { padding: 14 },
  noMatchText: { fontSize: 13, color: INACTIVE },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionText: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  categoryRow: { flexDirection: 'row', padding: 12, gap: 8 },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    backgroundColor: BG,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: INACTIVE },
  dateRow: { flexDirection: 'row' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  toggleLabel: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: BORDER, padding: 2 },
  toggleOn: { backgroundColor: PRIMARY },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
