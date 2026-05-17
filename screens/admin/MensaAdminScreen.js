import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert,
} from 'react-native';
import { TextInput, Button, Dialog, Portal, Snackbar, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import {
  getMensaWeek, upsertMensaDish, deleteMensaDish,
  upsertMensaMeta, getISOWeekString,
} from '../../services/contentService';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, ACCENT, ERROR } from '../../constants/colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS = { Mon: 'Mon / Mo', Tue: 'Tue / Di', Wed: 'Wed / Mi', Thu: 'Thu / Do', Fri: 'Fri / Fr' };
const CATEGORIES = [
  { value: 'main', label: 'Main Course / Hauptgericht' },
  { value: 'soup', label: 'Soup / Suppe' },
  { value: 'side', label: 'Side Dish / Beilage' },
  { value: 'dessert', label: 'Dessert' },
];
const TAGS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian / Vegetarisch' },
  { value: 'meat', label: 'Meat / Fleisch' },
  { value: 'fish', label: 'Fish / Fisch' },
  { value: 'glutenfree', label: 'Gluten-free / Glutenfrei' },
];

const emptyDish = () => ({
  id: '', name: '', nameEn: '', category: 'main', tags: [],
  prices: { student: '', employee: '', guest: '' },
});

export default function MensaAdminScreen() {
  const [week, setWeek] = useState(getISOWeekString());
  const [weekInput, setWeekInput] = useState(getISOWeekString());
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [metaNote, setMetaNote] = useState('');

  const loadWeek = useCallback(async (w) => {
    setLoading(true);
    const { data } = await getMensaWeek(w);
    setMenuData(data);
    setMetaNote(data?.note ?? '');
    setLoading(false);
  }, []);

  useEffect(() => { loadWeek(week); }, [week]);

  const dishes = menuData?.days?.[selectedDay]?.dishes ?? [];
  const dayDate = menuData?.days?.[selectedDay]?.date ?? '';

  const openAdd = () => setEditingDish({ ...emptyDish(), day: selectedDay, date: dayDate, week });
  const openEdit = (dish) => setEditingDish({ ...dish, day: selectedDay, date: dayDate, week });

  const handleSaveDish = async () => {
    if (!editingDish.name.trim()) return;
    setSaving(true);
    if (!editingDish.id) {
      editingDish.id = `${selectedDay.toLowerCase()}_${Date.now()}`;
    }
    const { error } = await upsertMensaDish(editingDish);
    setSaving(false);
    if (error) { setSnack(`Error: ${error.message}`); return; }
    setDialogVisible(false);
    setSnack('Dish saved ✓');
    loadWeek(week);
  };

  const handleDelete = (dish) => {
    Alert.alert('Delete dish?', `"${dish.name}" will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteMensaDish(dish.id);
          setSnack('Dish deleted');
          loadWeek(week);
        },
      },
    ]);
  };

  const handleSaveMeta = async () => {
    const { error } = await upsertMensaMeta({
      week, note: metaNote,
      contact: menuData?.contact ?? {},
    });
    setSnack(error ? `Error: ${error.message}` : 'Note saved ✓');
  };

  const toggleTag = (tag) => {
    const tags = editingDish.tags ?? [];
    setEditingDish({
      ...editingDish,
      tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    });
  };

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Week selector */}
        <View style={styles.weekRow}>
          <TextInput
            value={weekInput}
            onChangeText={setWeekInput}
            label="Week (e.g. 2026-W20) / Woche"
            mode="outlined"
            style={styles.weekInput}
            outlineColor={PRIMARY}
            activeOutlineColor={PRIMARY}
            dense
          />
          <Button
            mode="contained"
            buttonColor={PRIMARY}
            onPress={() => { setWeek(weekInput); }}
            style={styles.weekBtn}
          >
            Load
          </Button>
        </View>

        {/* Meta note */}
        <TouchableOpacity style={styles.metaToggle} onPress={() => setMetaExpanded((v) => !v)}>
          <Text style={styles.metaToggleText}>Edit Week Note / Wochenhinweis</Text>
          <Ionicons name={metaExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={INACTIVE} />
        </TouchableOpacity>
        {metaExpanded && (
          <View style={styles.metaBox}>
            <TextInput
              label="Week Note / Hinweis zur Woche"
              value={metaNote}
              onChangeText={setMetaNote}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineColor={PRIMARY}
              activeOutlineColor={PRIMARY}
            />
            <Button mode="contained" buttonColor={PRIMARY} onPress={handleSaveMeta} style={styles.saveBtn}>
              Save
            </Button>
          </View>
        )}

        {/* Day tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayTab, selectedDay === d && styles.dayTabActive]}
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dayTabText, selectedDay === d && styles.dayTabTextActive]}>
                {DAY_LABELS[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          <>
            {dishes.length === 0 ? (
              <Text style={styles.empty}>No dishes for this day. Tap + to add one.</Text>
            ) : (
              dishes.map((dish) => (
                <View key={dish.id} style={styles.dishCard}>
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    <Text style={styles.dishMeta}>
                      {CATEGORIES.find((c) => c.value === dish.category)?.label ?? dish.category}
                      {' · '}Student {dish.prices?.student}€
                    </Text>
                    <View style={styles.tagRow}>
                      {(dish.tags ?? []).map((t) => (
                        <View key={t} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{TAGS.find((x) => x.value === t)?.label ?? t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.dishActions}>
                    <TouchableOpacity onPress={() => { setEditingDish({ ...dish, day: selectedDay, date: dayDate, week }); setDialogVisible(true); }}>
                      <Ionicons name="pencil-outline" size={20} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(dish)} style={{ marginTop: 12 }}>
                      <Ionicons name="trash-outline" size={20} color={ERROR} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { openAdd(); setDialogVisible(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Edit Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editingDish?.id ? 'Edit Dish / Gericht bearbeiten' : 'Add Dish / Gericht hinzufügen'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput label="Bezeichnung (Deutsch) *" value={editingDish?.name ?? ''} onChangeText={(v) => setEditingDish({ ...editingDish, name: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Bezeichnung (Englisch)" value={editingDish?.nameEn ?? ''} onChangeText={(v) => setEditingDish({ ...editingDish, nameEn: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <Text style={styles.fieldLabel}>Category / Kategorie</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <Chip key={c.value} selected={editingDish?.category === c.value} onPress={() => setEditingDish({ ...editingDish, category: c.value })} style={styles.chip} selectedColor={PRIMARY}>
                    {c.label}
                  </Chip>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Tags / Merkmale</Text>
              <View style={styles.chipRow}>
                {TAGS.map((t) => (
                  <Chip key={t.value} selected={(editingDish?.tags ?? []).includes(t.value)} onPress={() => toggleTag(t.value)} style={styles.chip} selectedColor={PRIMARY}>
                    {t.label}
                  </Chip>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Prices (€) / Preise</Text>
              <TextInput label="Student" value={editingDish?.prices?.student ?? ''} onChangeText={(v) => setEditingDish({ ...editingDish, prices: { ...editingDish.prices, student: v } })} keyboardType="decimal-pad" mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} dense />
              <TextInput label="Staff / Mitarbeiter" value={editingDish?.prices?.employee ?? ''} onChangeText={(v) => setEditingDish({ ...editingDish, prices: { ...editingDish.prices, employee: v } })} keyboardType="decimal-pad" mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} dense />
              <TextInput label="Guest / Gast" value={editingDish?.prices?.guest ?? ''} onChangeText={(v) => setEditingDish({ ...editingDish, prices: { ...editingDish.prices, guest: v } })} keyboardType="decimal-pad" mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} dense />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveDish} loading={saving} textColor={PRIMARY}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: SURFACE },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  weekRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  weekInput: { flex: 1, backgroundColor: BG },
  weekBtn: { borderRadius: 8 },
  metaToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BG, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 4 },
  metaToggleText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  metaBox: { backgroundColor: BG, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 12, gap: 8 },
  dayTabs: { flexDirection: 'row', marginBottom: 16, marginTop: 12 },
  dayTab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  dayTabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayTabText: { fontSize: 14, fontWeight: '600', color: INACTIVE },
  dayTabTextActive: { color: '#fff' },
  dishCard: { flexDirection: 'row', backgroundColor: BG, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  dishMeta: { fontSize: 12, color: INACTIVE, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagChip: { backgroundColor: ACCENT, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tagChipText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  dishActions: { justifyContent: 'center', paddingLeft: 12 },
  empty: { textAlign: 'center', color: INACTIVE, marginTop: 40, fontSize: 14 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  dialog: { maxHeight: '85%' },
  input: { backgroundColor: BG, marginBottom: 10 },
  saveBtn: { borderRadius: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: INACTIVE, marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginBottom: 4 },
});
