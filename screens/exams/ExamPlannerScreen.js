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
import useStore from '../../store/useStore';
import { searchBuildings } from '../../services/buildings';
import {
  scheduleExamReminders,
  cancelExamReminders,
  saveExamPlans,
  loadExamData,
} from '../../services/reminders';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ERROR, ACCENT, BORDER } from '../../constants/colors';


export default function ExamPlannerScreen({ navigation, route }) {
  const { courseId, courseTitle, courseColor } = route.params;
  const setExamPlan = useStore((s) => s.setExamPlan);
  const examPlans = useStore((s) => s.examPlans);
  const setExamPlans = useStore((s) => s.setExamPlans);

  const existing = examPlans[courseId];

  // Parse stored YYYY-MM-DD as local midnight to avoid UTC-offset date shift
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

  useEffect(() => {
    loadExamData().then(({ plans }) => setExamPlans(plans));
  }, []);

  useEffect(() => {
    if (buildingSearch.length > 1) {
      setBuildingSuggestions(searchBuildings(buildingSearch).slice(0, 4));
    } else {
      setBuildingSuggestions([]);
    }
  }, [buildingSearch]);

  const missingFields = [];
  if (!examDate) missingFields.push('exam date');
  if (!examTime) missingFields.push('start time');
  if (!room.trim()) missingFields.push('room number');
  if (!building.trim()) missingFields.push('building');

  const isComplete = missingFields.length === 0;

  const handleSave = async () => {
    if (!examDate) {
      Alert.alert('Date required', 'Please set the exam date before saving.');
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
        examDate: examDate.toISOString().split('T')[0], // store as YYYY-MM-DD only
        examTime: timeStr,
        room: room.trim(),
        building: building.trim(),
        notes: notes.trim(),
        remindersEnabled,
        savedAt: new Date().toISOString(),
      };

      // Cancel old reminders
      await cancelExamReminders(courseId);

      // Schedule new reminders if enabled and complete
      if (remindersEnabled && timeStr) {
        await scheduleExamReminders(plan);
      }

      setExamPlan(courseId, plan);
      const { plans } = await loadExamData();
      await saveExamPlans({ ...plans, [courseId]: plan });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save exam plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header card */}
      <View style={[styles.courseCard, { borderLeftColor: courseColor ?? PRIMARY }]}>
        <Text style={styles.courseLabel}>Exam Plan</Text>
        <Text style={styles.courseTitle}>{courseTitle}</Text>
      </View>

      {/* Incomplete warning */}
      {!isComplete && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={18} color='#E65100' />
          <Text style={styles.warningText}>
            Missing: {missingFields.join(', ')}. Fill everything in for full reminders.
          </Text>
        </View>
      )}

      {/* Exam date */}
      <FormSection label="Exam Date">
        <SimpleDatePicker
          value={examDate}
          onChange={setExamDate}
          minimumDate={new Date()}
          label="Exam Date"
        />
      </FormSection>

      {/* Start time */}
      <FormSection label="Start Time">
        <SimpleTimePicker
          value={examTime}
          onChange={setExamTime}
          label="Start Time"
        />
      </FormSection>

      {/* Room */}
      <FormSection label="Room Number">
        <TextInput
          style={styles.input}
          placeholder="e.g. 9930-230"
          placeholderTextColor={INACTIVE}
          value={room}
          onChangeText={setRoom}
          maxLength={30}
        />
      </FormSection>

      {/* Building */}
      <FormSection label="Building">
        <TextInput
          style={styles.input}
          placeholder="Search campus buildings..."
          placeholderTextColor={INACTIVE}
          value={buildingSearch}
          onChangeText={(t) => { setBuildingSearch(t); setBuilding(t); }}
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
                <Ionicons name="business-outline" size={14} color={PRIMARY} />
                <Text style={styles.suggestionText}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </FormSection>

      {/* Notes */}
      <FormSection label="Notes">
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Allowed materials, tips, what to bring..."
          placeholderTextColor={INACTIVE}
          value={notes}
          onChangeText={setNotes}
          maxLength={300}
          multiline
        />
      </FormSection>

      {/* Reminders toggle */}
      <FormSection label="Reminders">
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setRemindersEnabled((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={18} color={PRIMARY} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Exam reminders</Text>
            <Text style={styles.toggleSub}>Day before + 2 hours before{!isComplete ? ' (needs all fields)' : ''}</Text>
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
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Save Exam Plan</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { padding: 16, paddingBottom: 48 },
  courseCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 5,
    marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  courseLabel: { fontSize: 11, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  courseTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF3E0', padding: 12, borderRadius: 10, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#E65100',
  },
  warningText: { flex: 1, fontSize: 13, color: '#5D4037', lineHeight: 18 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginLeft: 4 },
  sectionCard: { backgroundColor: BG, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ECECEC' },
  input: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1A1A1A' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  suggestions: { borderTopWidth: 1, borderTopColor: '#ECECEC' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionText: { fontSize: 14, color: '#1A1A1A' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  toggleLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  toggleSub: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: BORDER, padding: 2 },
  toggleOn: { backgroundColor: PRIMARY },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, padding: 16, borderRadius: 14, marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
