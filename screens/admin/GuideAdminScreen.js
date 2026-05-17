import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { TextInput, Button, Dialog, Portal, Snackbar, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { getGuideContent, upsertGuideItem, deleteGuideItem } from '../../services/contentService';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER, ACCENT, ERROR } from '../../constants/colors';

// ── Category definitions ────────────────────────────────────────
const CATEGORIES = [
  { key: 'emergency',     icon: 'alert-circle-outline',   label: 'Emergency Contacts / Notfall-Kontakte',  type: 'emergency' },
  { key: 'faq',           icon: 'help-circle-outline',    label: 'FAQ',                                    type: 'faq' },
  { key: 'checklist',     icon: 'checkbox-outline',       label: 'Arrival Checklist / Ankunft-Checkliste', type: 'checklist' },
  { key: 'offices',       icon: 'business-outline',       label: 'Offices / Ämter & Büros',                type: 'offices' },
  { key: 'contacts',      icon: 'people-outline',         label: 'Contacts / Kontakte',                    type: 'contacts' },
  { key: 'glossary',      icon: 'book-outline',           label: 'Glossary / Glossar',                     type: 'glossary' },
  { key: 'phrases',       icon: 'chatbubble-outline',     label: 'Phrasebook / Sprachführer',              type: 'phrases' },
  { key: 'accommodation', icon: 'home-outline',           label: 'Accommodation / Unterkunft',             type: 'info' },
  { key: 'work',          icon: 'briefcase-outline',      label: 'Work & Jobs / Arbeit & Jobs',            type: 'info' },
  { key: 'health',        icon: 'medkit-outline',         label: 'Health / Gesundheit',                    type: 'info' },
  { key: 'bureaucracy',   icon: 'document-text-outline',  label: 'Authorities / Behörden',                 type: 'info' },
  { key: 'language',      icon: 'language-outline',       label: 'Language Courses / Sprachkurse',         type: 'info' },
  { key: 'rights',        icon: 'shield-outline',         label: 'Rights & Duties / Rechte & Pflichten',   type: 'info' },
  { key: 'buildings',     icon: 'map-outline',            label: 'Buildings / Gebäude',                    type: 'buildings' },
];

// Fields per type
const FIELDS = {
  emergency: [
    { key: 'name', label: 'Name', required: true },
    { key: 'type', label: 'Typ', chips: ['emergency', 'campus', 'support'] },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-Mail', kb: 'email-address' },
    { key: 'description', label: 'Beschreibung', multiline: true },
  ],
  faq: [
    { key: 'category', label: 'Kategorie', chips: ['enrollment', 'academic', 'housing', 'financial', 'other'] },
    { key: 'question', label: 'Frage', required: true, multiline: true },
    { key: 'answer', label: 'Antwort', required: true, multiline: true },
  ],
  checklist: [
    { key: 'task', label: 'Aufgabe', required: true },
    { key: 'priority', label: 'Priorität', chips: ['urgent', 'high', 'normal'] },
    { key: 'details', label: 'Details', multiline: true },
    { key: 'office', label: 'Amt / Büro' },
    { key: 'deadline', label: 'Frist' },
  ],
  offices: [
    { key: 'name', label: 'Name', required: true },
    { key: 'building', label: 'Gebäude' },
    { key: 'room', label: 'Raum' },
    { key: 'hours', label: 'Öffnungszeiten' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-Mail', kb: 'email-address' },
  ],
  contacts: [
    { key: 'name', label: 'Name', required: true },
    { key: 'role', label: 'Rolle' },
    { key: 'organization', label: 'Organisation' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-Mail', kb: 'email-address' },
  ],
  glossary: [
    { key: 'term', label: 'Begriff', required: true },
    { key: 'translation', label: 'Übersetzung' },
    { key: 'definition', label: 'Definition', multiline: true },
  ],
  phrases: [
    { key: 'category', label: 'Kategorie' },
    { key: 'german', label: 'Deutsch', required: true },
    { key: 'english', label: 'Englisch', required: true },
    { key: 'phonetic', label: 'Aussprache' },
  ],
  buildings: [
    { key: 'name', label: 'Name', required: true },
    { key: 'number', label: 'Nummer' },
    { key: 'shortName', label: 'Kürzel' },
    { key: 'description', label: 'Beschreibung', multiline: true },
    { key: 'services', label: 'Angebote (kommagetrennt)' },
  ],
};

function getPrimaryText(item, type) {
  if (!item) return '';
  if (type === 'emergency' || type === 'offices' || type === 'contacts' || type === 'buildings') return item.name ?? item.id ?? '';
  if (type === 'faq') return item.question ?? item.id ?? '';
  if (type === 'checklist') return item.task ?? item.id ?? '';
  if (type === 'glossary') return item.term ?? item.id ?? '';
  if (type === 'phrases') return item.german ?? item.id ?? '';
  if (type === 'info') return item.title ?? item.summary?.slice(0, 60) ?? item.id ?? '';
  return item.id ?? '';
}

function getEmptyItem(type) {
  const base = { id: '' };
  if (!FIELDS[type]) return base;
  FIELDS[type].forEach((f) => { base[f.key] = ''; });
  return base;
}

// ── Root list of categories ─────────────────────────────────────
function CategoryList({ navigation }) {
  return (
    <FlatList
      data={CATEGORIES}
      keyExtractor={(item) => item.key}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.catCard}
          onPress={() => navigation.navigate('GuideCategoryAdmin', { category: item.key, label: item.label, type: item.type })}
        >
          <View style={styles.catIcon}>
            <Ionicons name={item.icon} size={22} color={PRIMARY} />
          </View>
          <Text style={styles.catLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      )}
    />
  );
}

// ── Category item editor ────────────────────────────────────────
function CategoryEditor({ route }) {
  const { category, label, type } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await getGuideContent(category);
    setItems(Array.isArray(data) ? data : [data]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const fields = FIELDS[type] ?? [];
  const isInfoType = type === 'info';

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const id = editing.id || `${category}_${Date.now()}`;
    const { error } = await upsertGuideItem({
      id,
      category,
      payload: { ...editing, id },
      sort_order: 0,
    });
    setSaving(false);
    if (error) { setSnack(`Fehler: ${error.message}`); return; }
    setDialogVisible(false);
    setSnack('Gespeichert ✓');
    load();
  };

  const handleDelete = (item) => {
    Alert.alert('Eintrag löschen?', `"${getPrimaryText(item, type)}" wird gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await deleteGuideItem(item.id ?? `${category}_${getPrimaryText(item, type)}`);
          setSnack('Gelöscht');
          load();
        },
      },
    ]);
  };

  const setField = (key, value) => setEditing((prev) => ({ ...prev, [key]: value }));

  if (loading) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 60 }} />;

  if (isInfoType) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={20} color={PRIMARY} />
          <Text style={styles.infoNoteText}>
            Dieser Bereich hat komplexe Inhalte (Konzepte, Links, Zusammenfassungen).{'\n'}
            Bearbeite die Einträge direkt im <Text style={{ fontWeight: '700', color: PRIMARY }}>Supabase Table Editor</Text> unter guide_content → Kategorie: {category}.
          </Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={styles.infoItem}>
            <Text style={styles.infoItemTitle}>{getPrimaryText(item, type)}</Text>
            <Text style={styles.infoItemSub} numberOfLines={3}>{JSON.stringify(item).slice(0, 120)}…</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(item, i) => item.id ?? String(i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>Keine Einträge. Tippe + um eins hinzuzufügen.</Text>}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>{getPrimaryText(item, type)}</Text>
            {fields[1] && !fields[1].chips && (
              <Text style={styles.itemSub} numberOfLines={1}>
                {item[fields[1].key] ?? ''}
              </Text>
            )}
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => { setEditing({ ...item }); setDialogVisible(true); }}>
                <Ionicons name="pencil-outline" size={20} color={PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginLeft: 16 }}>
                <Ionicons name="trash-outline" size={20} color={ERROR} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(getEmptyItem(type)); setDialogVisible(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editing?.id ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              {fields.map((f) =>
                f.chips ? (
                  <View key={f.key}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <View style={styles.chipRow}>
                      {f.chips.map((c) => (
                        <Chip key={c} selected={editing?.[f.key] === c} onPress={() => setField(f.key, c)} style={styles.chip} selectedColor={PRIMARY}>{c}</Chip>
                      ))}
                    </View>
                  </View>
                ) : (
                  <TextInput
                    key={f.key}
                    label={f.label + (f.required ? ' *' : '')}
                    value={editing?.[f.key] ?? ''}
                    onChangeText={(v) => setField(f.key, v)}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={PRIMARY}
                    activeOutlineColor={PRIMARY}
                    multiline={!!f.multiline}
                    numberOfLines={f.multiline ? 3 : 1}
                    keyboardType={f.kb ?? 'default'}
                    autoCapitalize={f.kb === 'email-address' ? 'none' : 'sentences'}
                  />
                )
              )}
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

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: BG },
  catCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  catIcon:       { width: 36, height: 36, borderRadius: 18, backgroundColor: `${PRIMARY}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catLabel:      { fontSize: 15, fontWeight: '600', color: '#222', flex: 1 },
  itemCard:      { backgroundColor: SURFACE, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  itemTitle:     { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 2 },
  itemSub:       { fontSize: 12, color: INACTIVE, marginBottom: 6 },
  itemActions:   { flexDirection: 'row', justifyContent: 'flex-end' },
  fab:           { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  dialog:        { maxHeight: '80%' },
  fieldLabel:    { fontSize: 12, color: INACTIVE, marginTop: 8, marginBottom: 4, marginLeft: 2 },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip:          { marginRight: 4, marginBottom: 4 },
  input:         { marginBottom: 8, backgroundColor: SURFACE },
  empty:         { textAlign: 'center', color: INACTIVE, marginTop: 40, fontSize: 14 },
  infoNote:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: `${PRIMARY}15`, borderRadius: 10, padding: 12, marginBottom: 16, gap: 8 },
  infoNoteText:  { flex: 1, fontSize: 13, color: '#333', lineHeight: 19 },
  infoItem:      { backgroundColor: SURFACE, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  infoItemTitle: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 4 },
  infoItemSub:   { fontSize: 11, color: INACTIVE },
});

// ── Exports ─────────────────────────────────────────────────────
export { CategoryList as GuideAdminScreen, CategoryEditor as GuideCategoryAdminScreen };
