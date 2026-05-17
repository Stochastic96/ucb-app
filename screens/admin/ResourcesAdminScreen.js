import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Dialog, Portal, Snackbar, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getCampusResources, upsertResource, deleteResource } from '../../services/contentService';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, ACCENT, ERROR } from '../../constants/colors';

const CATEGORIES = ['mobility', 'food', 'sports', 'study', 'sustainability', 'community', 'other'];
const CAT_LABELS = { mobility: 'Mobility / Mobilität', food: 'Food / Essen', sports: 'Sports / Sport', study: 'Study / Lernen', sustainability: 'Sustainability / Nachhaltigkeit', community: 'Community', other: 'Other / Sonstige' };

const emptyResource = () => ({
  id: '', category: 'other', title: '', description: '', location: '',
  contact: '', phone: '', schedule: '', recurringDay: '', recurringTime: '',
  icon: 'ellipse-outline', tags: [], tip: '',
});

export default function ResourcesAdminScreen() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('Alle');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getCampusResources();
    setResources(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const allCats = ['Alle', ...CATEGORIES];
  const filtered = filterCat === 'Alle' ? resources : resources.filter((r) => r.category === filterCat);

  const handleSave = async () => {
    if (!editing.title.trim()) return;
    setSaving(true);
    if (!editing.id) editing.id = editing.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '_' + Date.now();
    const { error } = await upsertResource(editing);
    setSaving(false);
    if (error) { setSnack(`Error: ${error.message}`); return; }
    setDialogVisible(false);
    setSnack('Saved ✓');
    load();
  };

  const handleDelete = (r) => {
    Alert.alert('Delete resource?', `"${r.title}" will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteResource(r.id); setSnack('Deleted'); load(); } },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name={item.icon ?? 'ellipse-outline'} size={22} color={PRIMARY} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>{CAT_LABELS[item.category] ?? item.category}{item.location ? ` · ${item.location}` : ''}</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilter} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        {allCats.map((c) => (
          <TouchableOpacity key={c} style={[styles.catChip, filterCat === c && styles.catChipActive]} onPress={() => setFilterCat(c)}>
            <Text style={[styles.catChipText, filterCat === c && styles.catChipTextActive]}>{c === 'Alle' ? 'All / Alle' : CAT_LABELS[c]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>No offers in this category.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(emptyResource()); setDialogVisible(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editing?.id ? 'Edit Offer / Bearbeiten' : 'Add Offer / Hinzufügen'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput label="Titel *" value={editing?.title ?? ''} onChangeText={(v) => setEditing({ ...editing, title: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <Text style={styles.fieldLabel}>Category / Kategorie</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <Chip key={c} selected={editing?.category === c} onPress={() => setEditing({ ...editing, category: c })} style={styles.chip} selectedColor={PRIMARY}>{CAT_LABELS[c]}</Chip>
                ))}
              </View>
              <TextInput label="Description / Beschreibung" value={editing?.description ?? ''} onChangeText={(v) => setEditing({ ...editing, description: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} multiline numberOfLines={3} />
              <TextInput label="Standort" value={editing?.location ?? ''} onChangeText={(v) => setEditing({ ...editing, location: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Kontakt (E-Mail)" value={editing?.contact ?? ''} onChangeText={(v) => setEditing({ ...editing, contact: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} keyboardType="email-address" autoCapitalize="none" />
              <TextInput label="Telefon" value={editing?.phone ?? ''} onChangeText={(v) => setEditing({ ...editing, phone: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} keyboardType="phone-pad" />
              <TextInput label="Öffnungszeiten / Zeitplan" value={editing?.schedule ?? ''} onChangeText={(v) => setEditing({ ...editing, schedule: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Wiederkehrender Tag (optional)" value={editing?.recurringDay ?? ''} onChangeText={(v) => setEditing({ ...editing, recurringDay: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} />
              <TextInput label="Uhrzeit (optional)" value={editing?.recurringTime ?? ''} onChangeText={(v) => setEditing({ ...editing, recurringTime: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} placeholder="14:00" />
              <TextInput label="Icon-Name (Ionicons)" value={editing?.icon ?? ''} onChangeText={(v) => setEditing({ ...editing, icon: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} placeholder="bicycle-outline" />
              <TextInput label="Tipp (optional)" value={editing?.tip ?? ''} onChangeText={(v) => setEditing({ ...editing, tip: v })} mode="outlined" style={styles.input} outlineColor={PRIMARY} activeOutlineColor={PRIMARY} multiline numberOfLines={2} />
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
  catFilter: { borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#fff', maxHeight: 60 },
  catChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#F0F0F0' },
  catChipActive: { backgroundColor: PRIMARY },
  catChipText: { fontSize: 13, color: INACTIVE, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  cardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
  cardMeta: { fontSize: 12, color: INACTIVE },
  cardActions: { paddingLeft: 12 },
  empty: { textAlign: 'center', color: INACTIVE, marginTop: 40 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  dialog: { maxHeight: '85%' },
  input: { backgroundColor: '#fff', marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: INACTIVE, marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginBottom: 4 },
});
