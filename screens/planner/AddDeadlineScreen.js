import React, { useState } from 'react';
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
import {
  scheduleDeadlineReminders,
  cancelDeadlineReminders,
  saveDeadlines,
} from '../../services/reminders';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ERROR, BORDER, ACCENT } from '../../constants/colors';

const CATEGORIES = [
  { key: 'academic', label: 'Academic', color: PRIMARY, icon: 'school-outline' },
  { key: 'bureaucratic', label: 'Bureaucratic', color: '#E65100', icon: 'document-text-outline' },
  { key: 'personal', label: 'Personal', color: '#7B1FA2', icon: 'person-outline' },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function AddDeadlineScreen({ navigation, route }) {
  const existing = route.params?.deadline;
  const courses = useStore((s) => s.courses);
  const addDeadline = useStore((s) => s.addDeadline);
  const updateDeadline = useStore((s) => s.updateDeadline);
  const deadlines = useStore((s) => s.deadlines);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'academic');
  const [dueDate, setDueDate] = useState(existing ? new Date(existing.dueDate) : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  })());
  const [remind24h, setRemind24h] = useState(existing?.remind24h ?? true);
  const [remind2h, setRemind2h] = useState(existing?.remind2h ?? false);
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const courseNames = courses.map((c) => c.title).filter(Boolean);
  const filtered = subject.length > 0
    ? courseNames.filter((n) => n.toLowerCase().includes(subject.toLowerCase())).slice(0, 4)
    : [];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this deadline.');
      return;
    }
    setSaving(true);
    try {
      const deadline = {
        id: existing?.id ?? uid(),
        title: title.trim(),
        subject: subject.trim(),
        note: note.trim(),
        category,
        dueDate: dueDate.toISOString(),
        remind24h,
        remind2h,
        completed: existing?.completed ?? false,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      if (existing) {
        await cancelDeadlineReminders(existing.id);
      }

      if (!deadline.completed) {
        await scheduleDeadlineReminders(deadline);
      }

      if (existing) {
        updateDeadline(existing.id, deadline);
        const next = deadlines.map((d) => d.id === existing.id ? deadline : d);
        await saveDeadlines(next);
      } else {
        addDeadline(deadline);
        await saveDeadlines([deadline, ...deadlines]);
      }

      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save deadline. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Title */}
      <FormSection label="Title *">
        <TextInput
          style={styles.input}
          placeholder="e.g. Portfolio submission"
          placeholderTextColor={INACTIVE}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          autoFocus={!existing}
        />
      </FormSection>

      {/* Subject */}
      <FormSection label="Subject / Module">
        <TextInput
          style={styles.input}
          placeholder="e.g. Media Design or pick from your courses"
          placeholderTextColor={INACTIVE}
          value={subject}
          onChangeText={(t) => { setSubject(t); setShowCourseSuggestions(t.length > 0); }}
          onFocus={() => setShowCourseSuggestions(subject.length > 0)}
          onBlur={() => setTimeout(() => setShowCourseSuggestions(false), 150)}
          maxLength={80}
        />
        {showCourseSuggestions && filtered.length > 0 && (
          <View style={styles.suggestions}>
            {filtered.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.suggestionRow}
                onPress={() => { setSubject(name); setShowCourseSuggestions(false); }}
              >
                <Ionicons name="book-outline" size={14} color={PRIMARY} />
                <Text style={styles.suggestionText} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </FormSection>

      {/* Category */}
      <FormSection label="Category">
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.75}
              >
                <Ionicons name={cat.icon} size={14} color={active ? '#fff' : INACTIVE} />
                <Text style={[styles.categoryChipText, active && { color: '#fff' }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormSection>

      {/* Due date & time */}
      <FormSection label="Due Date & Time">
        <View style={styles.dateRow}>
          <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#ECECEC' }}>
            <SimpleDatePicker
              value={dueDate}
              onChange={(d) => setDueDate((prev) => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; })}
              minimumDate={new Date()}
              label="Due Date"
            />
          </View>
          <View style={{ flex: 1 }}>
            <SimpleTimePicker
              value={dueDate}
              onChange={(d) => setDueDate((prev) => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; })}
              label="Due Time"
            />
          </View>
        </View>
      </FormSection>

      {/* Note */}
      <FormSection label="Short Note">
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="Any details or instructions to remember..."
          placeholderTextColor={INACTIVE}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          multiline
        />
        <Text style={styles.charCount}>{note.length}/200</Text>
      </FormSection>

      {/* Reminders */}
      <FormSection label="Reminders">
        <ToggleRow
          label="24 hours before"
          icon="notifications-outline"
          value={remind24h}
          onToggle={() => setRemind24h((v) => !v)}
        />
        <ToggleRow
          label="2 hours before"
          icon="alarm-outline"
          value={remind2h}
          onToggle={() => setRemind2h((v) => !v)}
          last
        />
      </FormSection>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Ionicons name={existing ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
        <Text style={styles.saveBtnText}>{existing ? 'Save Changes' : 'Add Deadline'}</Text>
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
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1A1A1A',
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: INACTIVE, textAlign: 'right', paddingRight: 14, paddingBottom: 8 },
  suggestions: { borderTopWidth: 1, borderTopColor: '#ECECEC' },
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
  categoryRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
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
