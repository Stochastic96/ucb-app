import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { useTranslation } from '../services/i18n';
import useStore from '../store/useStore';
import { LANGUAGES, MAX_LANGS } from '../services/campusProfile';

// Multi-select language picker (up to MAX_LANGS). Selected languages travel on
// the mesh as 1-byte ids from the LANGUAGES wire table — names render locally.
export default function LanguagePickerModal({ visible, onClose, title, selectedIds, onChange }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const language = useStore((s) => s.language);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => l.en.toLowerCase().includes(q) || l.de.toLowerCase().includes(q) || l.code.includes(q)
    );
  }, [query]);

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < MAX_LANGS) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.count}>{selectedIds.length}/{MAX_LANGS}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={c.text} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('campus_lang_search')}
          placeholderTextColor={c.textMuted}
          autoCorrect={false}
        />

        <FlatList
          data={items}
          keyExtractor={(l) => String(l.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = selectedIds.includes(item.id);
            return (
              <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)} activeOpacity={0.7}>
                <Text style={styles.code}>{item.code.toUpperCase()}</Text>
                <Text style={[styles.rowText, active && styles.rowTextActive]}>
                  {language === 'de' ? item.de : item.en}
                </Text>
                <Ionicons
                  name={active ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={active ? c.primary : c.textMuted}
                />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneText}>{t('common_done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, gap: 10,
  },
  title: { ...c.type.title, color: c.text },
  count: { ...c.type.caption, color: c.textMuted, marginTop: 2 },
  search: {
    marginHorizontal: 16, marginBottom: 8, height: 44,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: c.radius.md,
    paddingHorizontal: 12, ...c.type.body, color: c.text,
  },
  listContent: { paddingBottom: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  code: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, color: c.textMuted, width: 28 },
  rowText: { ...c.type.body, color: c.text, flex: 1 },
  rowTextActive: { fontFamily: c.fonts.bodySemiBold },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  doneBtn: { height: 48, borderRadius: c.radius.lg, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  doneText: { ...c.type.bodyStrong, color: c.onPrimary },
});
