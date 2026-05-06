import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Dialog, Portal, Snackbar, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getSportsSchedule, upsertSportsEntry, deleteSportsEntry } from '../../services/contentService';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, ERROR } from '../../constants/colors';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const LOCATIONS = ['Halle', 'Pitch', 'Außen', 'Online', 'Sonstige'];

const emptyEntry = () => ({
  id: '', day: 'Monday', startTime: '', endTime: '',
  sport: '', instructor: '', location: 'Halle', note: '',
});

export default function SportsAdminScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState('Alle');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getSportsSchedule();
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const allDays = ['Alle', ...DAYS];
  const filtered = filterDay === 'Alle' ? entries : entries.filter((e) => e.day === filterDay);

  const handleSave = async () => {
    if (!editing.sport.trim() || !editing.startTime || !editing.endTime) return;
    setSaving(true);
    if (!editing.id) editing.id = `sport_${Date.now()}`;
    const { error } = await upsertSportsEntry(editing);
    setSaving(false);
    if (error) { setSnack(`Fehler: ${error.message}`); return; }
    setDialogVisible(false);
    setSnack('Gespeichert ✓');
    load();
  };

  const handleDelete = (entry) => {
    Alert.alert('Eintrag löschen?', `"${entry.sport}" am ${entry.day} wird gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteSportsEntry(entry.id); setSnack('Gelöscht'); load(); } },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardSport}>{item.sport}</Text>
        <Text style={styles.cardMeta}>{item.day} · {item.startTime}–{item.endTime}</Text>
        {item.instructor ? <Text style={styles.cardMeta}>Übungsleiter: {item.instructor}</Text> : null}
        {item.location ? <Text style={styles.cardMeta}>Ort: {item.location}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => { setEditing({ ...item }); setDialogVisible(true); }}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayFilter} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        {allDays.map((d) => (
          <TouchableOpacity key={d} style={[styles.dayChip, filterDay === d && styles.dayChipActive]} onPress={() => setFilterDay(d)}>
            <Text style={[styles.dayChipText, filterDay === d && styles.dayChipTextActive]}>{d === 'Alle' ? 'Alle' : DAYS_DE[DAYS.indexOf(d)]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>Keine Einträge gefunden.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(emptyEntry()); setDialogVisible(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editing?.id ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <Text style={styles.fieldLabel}>Wochentag</Text>
              <View style={styles.chipRow}>
                {DAYS.map((d, i) => (
                  <Chip key={d} selected={editing?.day === d} onPress={() => setEditing({ ...editing, day: d })} style={styles.chip} selectedColor={PRIMARY}>{DAYS_DE[i]}</Chip>
                ))}
              </View>
              <TextInput label="Sportart *" value={editing?.sport ?? ''} onChangeText={(v) => setEditing({ ...editing, sport: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Übungsleiter" value={editing?.instructor ?? ''} onChangeText={(v) => setEditing({ ...editing, instructor: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <View style={styles.timeRow}>
                <TextInput label="Startzeit *" value={editing?.startTime ?? ''} onChangeText={(v) => setEditing({ ...editing, startTime: v })} mode="outlined" style={[styles.input, { flex: 1 }]} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} placeholder="15:00" />
                <TextInput label="Endzeit *" value={editing?.endTime ?? ''} onChangeText={(v) => setEditing({ ...editing, endTime: v })} mode="outlined" style={[styles.input, { flex: 1 }]} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} placeholder="16:30" />
              </View>
              <Text style={styles.fieldLabel}>Ort</Text>
              <View style={styles.chipRow}>
                {LOCATIONS.map((l) => (
                  <Chip key={l} selected={editing?.location === l} onPress={() => setEditing({ ...editing, location: l })} style={styles.chip} selectedColor={PRIMARY}>{l}</Chip>
                ))}
              </View>
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
  dayFilter: { borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#fff', maxHeight: 60 },
  dayChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#F0F0F0' },
  dayChipActive: { backgroundColor: PRIMARY },
  dayChipText: { fontSize: 13, color: INACTIVE, fontWeight: '600' },
  dayChipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  cardInfo: { flex: 1 },
  cardSport: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: INACTIVE, marginBottom: 2 },
  cardActions: { justifyContent: 'center', paddingLeft: 12 },
  empty: { textAlign: 'center', color: INACTIVE, marginTop: 40 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  dialog: { maxHeight: '85%' },
  input: { backgroundColor: '#fff', marginBottom: 10 },
  timeRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: INACTIVE, marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginBottom: 4 },
});
