import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { TextInput, Button, Dialog, Portal, Snackbar, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getCampusEvents, upsertCampusEvent, deleteCampusEvent } from '../../services/contentService';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, ACCENT, ERROR } from '../../constants/colors';

const CATEGORIES = ['party', 'gaming', 'social', 'academic', 'sports', 'outdoor', 'cultural', 'recurring'];
const CAT_LABELS = { party: 'Party', gaming: 'Gaming', social: 'Sozial', academic: 'Akademisch', sports: 'Sport', outdoor: 'Outdoor', cultural: 'Kultur', recurring: 'Wiederkehrend' };
const ORGANIZERS = ['KADU', 'AStA', 'Hochschule', 'Sonstige'];
const DAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const emptyEvent = () => ({
  id: '', title: '', date: '', endDate: '', category: 'social',
  organizer: 'KADU', time: '', note: '', recurringDay: '', isRecurring: false,
});

export default function EventsAdminScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('once'); // 'once' | 'recurring'
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getCampusEvents();
    setEvents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter((e) => (tab === 'recurring' ? e.isRecurring : !e.isRecurring));

  const openAdd = () => { setEditing({ ...emptyEvent(), isRecurring: tab === 'recurring' }); setDialogVisible(true); };
  const openEdit = (ev) => { setEditing({ ...ev }); setDialogVisible(true); };

  const handleSave = async () => {
    if (!editing.title.trim()) return;
    setSaving(true);
    if (!editing.id) editing.id = `ev_${Date.now()}`;
    const { error } = await upsertCampusEvent(editing);
    setSaving(false);
    if (error) { setSnack(`Fehler: ${error.message}`); return; }
    setDialogVisible(false);
    setSnack('Gespeichert ✓');
    load();
  };

  const handleDelete = (ev) => {
    Alert.alert('Event löschen?', `"${ev.title}" wird gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteCampusEvent(ev.id); setSnack('Gelöscht'); load(); } },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.catDot, { backgroundColor: PRIMARY }]} />
        <View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {item.isRecurring ? item.recurringDay : item.date}
            {item.organizer ? ` · ${item.organizer}` : ''}
            {item.time ? ` · ${item.time}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(item)}>
          <Ionicons name="pencil-outline" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginTop: 8 }}>
          <Ionicons name="trash-outline" size={20} color={ERROR} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {['once', 'recurring'].map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'once' ? 'Einmalig' : 'Wiederkehrend'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>Keine Einträge. Tippe + um eins hinzuzufügen.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editing?.id ? 'Event bearbeiten' : 'Event hinzufügen'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput label="Titel *" value={editing?.title ?? ''} onChangeText={(v) => setEditing({ ...editing, title: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              {editing?.isRecurring ? (
                <>
                  <Text style={styles.fieldLabel}>Wochentag</Text>
                  <View style={styles.chipRow}>
                    {DAYS_DE.map((d) => (
                      <Chip key={d} selected={editing.recurringDay === d} onPress={() => setEditing({ ...editing, recurringDay: d })} style={styles.chip} selectedColor={PRIMARY}>{d}</Chip>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <TextInput label="Datum (JJJJ-MM-TT)" value={editing?.date ?? ''} onChangeText={(v) => setEditing({ ...editing, date: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} placeholder="2026-06-15" />
                  <TextInput label="Enddatum (optional)" value={editing?.endDate ?? ''} onChangeText={(v) => setEditing({ ...editing, endDate: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
                </>
              )}
              <Text style={styles.fieldLabel}>Kategorie</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <Chip key={c} selected={editing?.category === c} onPress={() => setEditing({ ...editing, category: c })} style={styles.chip} selectedColor={PRIMARY}>{CAT_LABELS[c]}</Chip>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Organisator</Text>
              <View style={styles.chipRow}>
                {ORGANIZERS.map((o) => (
                  <Chip key={o} selected={editing?.organizer === o} onPress={() => setEditing({ ...editing, organizer: o })} style={styles.chip} selectedColor={PRIMARY}>{o}</Chip>
                ))}
              </View>
              <TextInput label="Uhrzeit (optional, z.B. 20:00)" value={editing?.time ?? ''} onChangeText={(v) => setEditing({ ...editing, time: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Hinweis (optional)" value={editing?.note ?? ''} onChangeText={(v) => setEditing({ ...editing, note: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} multiline numberOfLines={2} />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Abbrechen</Button>
            <Button onPress={handleSave} loading={saving} textColor={PRIMARY}>Speichern</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: SURFACE },
  tabRow: { flexDirection: 'row', backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, color: INACTIVE, fontWeight: '600' },
  tabTextActive: { color: PRIMARY },
  card: { flexDirection: 'row', backgroundColor: BG, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
  cardMeta: { fontSize: 12, color: INACTIVE },
  cardActions: { justifyContent: 'center', paddingLeft: 12 },
  empty: { textAlign: 'center', color: INACTIVE, marginTop: 40 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  dialog: { maxHeight: '85%' },
  input: { backgroundColor: BG, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: INACTIVE, marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginBottom: 4 },
});
