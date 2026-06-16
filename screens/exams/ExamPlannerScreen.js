import React, { useState, useEffect } from 'react';
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
import Tooltip from '../../components/Tooltip';
import useStore from '../../store/useStore';
import { searchBuildings } from '../../services/buildings';
import { trackEvent } from '../../services/analytics';
import { enqueueOfflineOp } from '../../services/offlineQueue';
import {
  scheduleExamReminders,
  cancelExamReminders,
  saveExamPlans,
  loadExamData,
} from '../../services/reminders';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n';


export default function ExamPlannerScreen({ navigation, route }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { courseId, courseTitle, courseColor } = route.params ?? {};
  const setExamPlan = useStore((s) => s.setExamPlan);
  const examPlans = useStore((s) => s.examPlans);
  const setExamPlans = useStore((s) => s.setExamPlans);

  const existing = examPlans[courseId];

  const [examDate, setExamDate] = useState(existing?.examDate ? new Date(existing.examDate + 'T00:00:00') : null);
  const [examTime, setExamTime] = useState(existing?.examTime ? (() => {
    const d = new Date(); const [h, m] = existing.examTime.split(':'); d.setHours(+h, +m, 0, 0); return d;
  })() : null);
  const [room, setRoom] = useState(existing?.room ?? '');
  const [building, setBuilding] = useState(existing?.building ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [remindersEnabled, setRemindersEnabled] = useState(existing?.remindersEnabled ?? true);
  const [buildingSearch, setBuildingSearch] = useState(building);
  const [buildingSuggestions, setBuildingSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);

  const openSidebar = useStore((s) => s.openSidebar);

  useEffect(() => {
    loadExamData().then(({ plans }) => setExamPlans(plans)).catch(() => {});
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 4 }}>
          <Tooltip text={t('exam_planner_tooltip')} />
          <TouchableOpacity onPress={openSidebar} hitSlop={12}>
            <Ionicons name="menu" size={24} color={c.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, []);

  useEffect(() => {
    if (buildingSearch.length > 1) {
      setBuildingSuggestions(searchBuildings(buildingSearch).slice(0, 4));
    } else {
      setBuildingSuggestions([]);
    }
  }, [buildingSearch]);

  const missingFields = [];
  if (!examDate) missingFields.push(t('exam_planner_date').toLowerCase());
  if (!examTime) missingFields.push(t('exam_planner_time').toLowerCase());
  if (!room.trim()) missingFields.push(t('exam_planner_room').toLowerCase());
  if (!building.trim()) missingFields.push(t('exam_planner_building').toLowerCase());

  const isComplete = missingFields.length === 0;

  const handleSave = async () => {
    if (!examDate) {
      Alert.alert(t('exam_planner_date_required_title'), t('exam_planner_date_required_msg'));
      return;
    }
    setSaving(true);
    try {
      const timeStr = examTime
        ? `${String(examTime.getHours()).padStart(2, '0')}:${String(examTime.getMinutes()).padStart(2, '0')}`
        : null;

      const plan = {
        courseId,
        courseTitle,
        examDate: examDate.toISOString().split('T')[0],
        examTime: timeStr,
        room: room.trim(),
        building: building.trim(),
        notes: notes.trim(),
        remindersEnabled,
        savedAt: new Date().toISOString(),
      };

      const { isOffline } = useStore.getState();

      if (isOffline) {
        enqueueOfflineOp('CANCEL_EXAM_REMINDERS', { courseId });
      } else {
        await cancelExamReminders(courseId);
      }

      if (remindersEnabled && timeStr) {
        // Check if notifications are enabled in app settings
        const { settings } = useStore.getState();
        if (!settings.notificationsEnabled) {
          Alert.alert(
            t('exam_notif_permission_title'),
            t('exam_notif_disabled_msg')
          );
          // Still save plan, just no reminders scheduled
        } else if (isOffline) {
          enqueueOfflineOp('SCHEDULE_EXAM_REMINDERS', { plan });
        } else {
          await scheduleExamReminders(plan);
        }
      }

      const { plans } = await loadExamData();
      await saveExamPlans({ ...plans, [courseId]: plan });
      setExamPlan(courseId, plan);
      trackEvent('feature_use', 'exam_plan_saved', { course_id: courseId, reminders_enabled: remindersEnabled });
      navigation.goBack();
    } catch {
      Alert.alert(t('common_error'), t('exam_planner_error_msg'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header card */}
      <View style={[styles.courseCard, { borderLeftColor: courseColor ?? c.primary }]}>
        <Text style={styles.courseLabel}>{t('screen_exam_plan')}</Text>
        <Text style={styles.courseTitle}>{courseTitle}</Text>
      </View>

      {/* Incomplete warning */}
      {!isComplete && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={18} color={c.mode === 'dark' ? '#FFB74D' : '#E65100'} />
          <Text style={styles.warningText}>
            {t('exam_planner_missing', { fields: missingFields.join(', ') })}
          </Text>
        </View>
      )}

      {/* Exam date */}
      <FormSection label={t('exam_planner_date')}>
        <SimpleDatePicker
          value={examDate}
          onChange={setExamDate}
          minimumDate={new Date()}
          label={t('exam_planner_date')}
        />
      </FormSection>

      {/* Start time */}
      <FormSection label={t('exam_planner_time')}>
        <SimpleTimePicker
          value={examTime}
          onChange={setExamTime}
          label={t('exam_planner_time')}
        />
      </FormSection>

      {/* Room */}
      <FormSection label={t('exam_planner_room')}>
        <TextInput
          style={styles.input}
          placeholder={t('exam_planner_room_placeholder')}
          placeholderTextColor={c.textMuted}
          value={room}
          onChangeText={setRoom}
          maxLength={30}
        />
      </FormSection>

      {/* Building */}
      <FormSection label={t('exam_planner_building')}>
        <TextInput
          style={styles.input}
          placeholder={t('exam_planner_building_placeholder')}
          placeholderTextColor={c.textMuted}
          value={buildingSearch}
          onChangeText={(v) => { setBuildingSearch(v); setBuilding(v); }}
          maxLength={60}
        />
        {buildingSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {buildingSuggestions.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.suggestionRow}
                onPress={() => { setBuilding(b.name); setBuildingSearch(b.name); setBuildingSuggestions([]); }}
              >
                <Ionicons name="business-outline" size={14} color={c.brandIcon} />
                <Text style={styles.suggestionText}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </FormSection>

      {/* Notes */}
      <FormSection label={t('exam_planner_notes')}>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder={t('exam_planner_notes_placeholder')}
          placeholderTextColor={c.textMuted}
          value={notes}
          onChangeText={setNotes}
          maxLength={300}
          multiline
        />
      </FormSection>

      {/* Reminders toggle */}
      <FormSection label={t('exam_planner_reminders')}>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setRemindersEnabled((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={18} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('exam_planner_reminders_label')}</Text>
            <Text style={styles.toggleSub}>
              {t('exam_planner_reminders_sub')}{!isComplete ? t('exam_planner_reminders_needs_fields') : ''}
            </Text>
          </View>
          <View style={[styles.toggle, remindersEnabled && styles.toggleOn]}>
            <View style={[styles.toggleThumb, remindersEnabled && styles.toggleThumbOn]} />
          </View>
        </TouchableOpacity>
      </FormSection>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark-circle" size={20} color={c.onPrimary} />
        <Text style={styles.saveBtnText}>{t('exam_planner_save')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FormSection({ label, children }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 48 },
  courseCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 5,
    marginBottom: 14,
    shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  courseLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  courseTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: c.mode === 'dark' ? 'rgba(255,152,0,0.15)' : '#FFF3E0', padding: 12, borderRadius: 10, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: c.mode === 'dark' ? '#FFB74D' : '#E65100',
  },
  warningText: { flex: 1, fontSize: 13, color: c.mode === 'dark' ? '#E0C9A6' : '#5D4037', lineHeight: 18 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginLeft: 4 },
  sectionCard: { backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  input: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: c.text },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  suggestions: { borderTopWidth: 1, borderTopColor: c.border },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.border },
  suggestionText: { fontSize: 14, color: c.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  toggleLabel: { fontSize: 15, color: c.text, fontWeight: '500' },
  toggleSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: c.border, padding: 2 },
  toggleOn: { backgroundColor: c.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, padding: 16, borderRadius: 14, marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },
});
