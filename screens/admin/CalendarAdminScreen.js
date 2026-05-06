import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { TextInput, Button, Dialog, Portal, Snackbar, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getSemesterCalendar, upsertSemester, upsertCalendarEvent, deleteCalendarEvent } from '../../services/contentService';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, ERROR } from '../../constants/colors';

const EVENT_CATS = [
  { value: 'academic', label: 'Akademisch' },
  { value: 'exams',    label: 'Prüfungen' },
  { value: 'admin',    label: 'Verwaltung' },
  { value: 'holiday',  label: 'Feiertag' },
];

const emptyCalEvent = (semId) => ({
  id: '', semesterId: semId, title: '', titleDe: '', date: '', endDate: '',
  category: 'academic', description: '', icon: 'calendar-outline', important: false,
});

export default function CalendarAdminScreen() {
  const [calData, setCalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semForm, setSemForm] = useState({});
  const [eventDialog, setEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getSemesterCalendar();
    setCalData(data);
    if (data?.semesters?.length) {
      const sem = data.semesters[0];
      setSemForm({
        id: sem.id, name: sem.name, shortName: sem.shortName ?? '',
        color: sem.color ?? '#6FAE3E',
        lectureStart: sem.lectureStart ?? '',
        lectureEnd: sem.lectureEnd ?? '',
        examStart: sem.examStart ?? '',
        examEnd: sem.examEnd ?? '',
        isCurrent: data.current === sem.id,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const semester = calData?.semesters?.[0];
  const semEvents = semester?.events ?? [];

  const handleSaveSemester = async () => {
    setSaving(true);
    const { error } = await upsertSemester(semForm);
    setSaving(false);
    setSnack(error ? `Fehler: ${error.message}` : 'Semester gespeichert ✓');
    if (!error) load();
  };

  const handleSaveEvent = async () => {
    if (!editingEvent?.title?.trim() || !editingEvent?.date) return;
    setSaving(true);
    const ev = { ...editingEvent, id: editingEvent.id || `calev_${Date.now()}` };
    const { error } = await upsertCalendarEvent(ev);
    setSaving(false);
    if (error) { setSnack(`Fehler: ${error.message}`); return; }
    setEventDialog(false);
    setSnack('Termin gespeichert ✓');
    load();
  };

  const handleDeleteEvent = (ev) => {
    Alert.alert('Termin löschen?', `"${ev.title}" wird gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteCalendarEvent(ev.id); setSnack('Gelöscht'); load(); } },
    ]);
  };

  if (loading) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 60 }} />;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Semester block */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Semester-Details</Text>
          <TextInput label="Semestername" value={semForm.name ?? ''} onChangeText={(v) => setSemForm({ ...semForm, name: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
          <TextInput label="Kurzbezeichnung (z.B. SS 2026)" value={semForm.shortName ?? ''} onChangeText={(v) => setSemForm({ ...semForm, shortName: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
          <View style={styles.row}>
            <TextInput label="Vorlesungsbeginn" value={semForm.lectureStart ?? ''} onChangeText={(v) => setSemForm({ ...semForm, lectureStart: v })} placeholder="2026-03-16" mode="outlined" style={[styles.input, styles.half]} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
            <TextInput label="Vorlesungsende" value={semForm.lectureEnd ?? ''} onChangeText={(v) => setSemForm({ ...semForm, lectureEnd: v })} placeholder="2026-07-11" mode="outlined" style={[styles.input, styles.half]} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
          </View>
          <View style={styles.row}>
            <TextInput label="Prüfungsbeginn" value={semForm.examStart ?? ''} onChangeText={(v) => setSemForm({ ...semForm, examStart: v })} placeholder="2026-07-13" mode="outlined" style={[styles.input, styles.half]} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
            <TextInput label="Prüfungsende" value={semForm.examEnd ?? ''} onChangeText={(v) => setSemForm({ ...semForm, examEnd: v })} placeholder="2026-08-01" mode="outlined" style={[styles.input, styles.half]} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Aktuelles Semester</Text>
            <Switch value={semForm.isCurrent ?? false} onValueChange={(v) => setSemForm({ ...semForm, isCurrent: v })} />
          </View>
          <Button mode="contained" buttonColor={PRIMARY} onPress={handleSaveSemester} loading={saving} style={styles.saveBtn}>
            Semester speichern
          </Button>
        </View>

        {/* Events block */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Termine ({semEvents.length})</Text>
            <TouchableOpacity style={styles.addInline} onPress={() => { setEditingEvent(emptyCalEvent(semester?.id ?? '')); setEventDialog(true); }}>
              <Ionicons name="add" size={16} color={PRIMARY} />
              <Text style={styles.addInlineText}>Hinzufügen</Text>
            </TouchableOpacity>
          </View>
          {semEvents.map((ev) => (
            <View key={ev.id} style={styles.evCard}>
              <View style={styles.evInfo}>
                <Text style={styles.evTitle}>{ev.title}{ev.important ? ' ★' : ''}</Text>
                <Text style={styles.evMeta}>
                  {ev.date}{ev.endDate ? ` – ${ev.endDate}` : ''}
                  {' · '}{EVENT_CATS.find((c) => c.value === ev.category)?.label ?? ev.category}
                </Text>
              </View>
              <View style={styles.evActions}>
                <TouchableOpacity onPress={() => { setEditingEvent({ ...ev, semesterId: semester?.id ?? '' }); setEventDialog(true); }}>
                  <Ionicons name="pencil-outline" size={18} color={PRIMARY} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteEvent(ev)} style={{ marginTop: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={ERROR} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={eventDialog} onDismiss={() => setEventDialog(false)} style={styles.dialog}>
          <Dialog.Title>{editingEvent?.id ? 'Termin bearbeiten' : 'Termin hinzufügen'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput label="Titel *" value={editingEvent?.title ?? ''} onChangeText={(v) => setEditingEvent({ ...editingEvent, title: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Titel (Deutsch)" value={editingEvent?.titleDe ?? ''} onChangeText={(v) => setEditingEvent({ ...editingEvent, titleDe: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Datum * (JJJJ-MM-TT)" value={editingEvent?.date ?? ''} onChangeText={(v) => setEditingEvent({ ...editingEvent, date: v })} placeholder="2026-05-01" mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Enddatum (optional)" value={editingEvent?.endDate ?? ''} onChangeText={(v) => setEditingEvent({ ...editingEvent, endDate: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <Text style={styles.fieldLabel}>Kategorie</Text>
              <View style={styles.chipRow}>
                {EVENT_CATS.map((c) => (
                  <Chip key={c.value} selected={editingEvent?.category === c.value} onPress={() => setEditingEvent({ ...editingEvent, category: c.value })} style={styles.chip} selectedColor={PRIMARY}>{c.label}</Chip>
                ))}
              </View>
              <TextInput label="Beschreibung" value={editingEvent?.description ?? ''} onChangeText={(v) => setEditingEvent({ ...editingEvent, description: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} multiline numberOfLines={3} />
              <TextInput label="Icon (Ionicons-Name)" value={editingEvent?.icon ?? ''} onChangeText={(v) => setEditingEvent({ ...editingEvent, icon: v })} placeholder="school-outline" mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Wichtiger Termin (fett hervorgehoben)</Text>
                <Switch value={editingEvent?.important ?? false} onValueChange={(v) => setEditingEvent({ ...editingEvent, important: v })} />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setEventDialog(false)}>Abbrechen</Button>
            <Button onPress={handleSaveEvent} loading={saving} textColor={PRIMARY}>Speichern</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: SURFACE },
  content: { padding: 16, paddingBottom: 60 },
  block: { backgroundColor: BG, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  blockTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  input: { backgroundColor: BG, marginBottom: 10 },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: 14, color: '#1A1A1A', flex: 1, paddingRight: 8 },
  saveBtn: { borderRadius: 8 },
  addInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addInlineText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  evCard: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, marginBottom: 8 },
  evInfo: { flex: 1 },
  evTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
  evMeta: { fontSize: 12, color: INACTIVE },
  evActions: { paddingLeft: 12, justifyContent: 'center' },
  dialog: { maxHeight: '85%' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: INACTIVE, marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginBottom: 4 },
});
