import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { useTranslation } from '../services/i18n';
import useStore from '../store/useStore';
import { searchPrograms, groupProgramsByLevel } from '../services/campusPrograms';

// Full-screen searchable picker for the UCB degree program. The chosen program
// travels on the Bluetooth mesh as a 1-byte id only (see campus_programs.json);
// this list is self-reported and never read from Stud.IP.
export default function ProgramPickerModal({ visible, onClose, selectedId, onSelect }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const language = useStore((s) => s.language);
  const [query, setQuery] = useState('');

  const sections = useMemo(
    () =>
      groupProgramsByLevel(searchPrograms(query)).map((s) => ({
        title: t(`campus_level_${s.level}`),
        data: s.data,
      })),
    [query, t]
  );

  const pick = (id) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('campus_program_pick_title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={c.text} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('campus_program_search')}
          placeholderTextColor={c.textMuted}
          autoCorrect={false}
        />

        <SectionList
          sections={sections}
          keyExtractor={(p) => String(p.id)}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <TouchableOpacity style={styles.row} onPress={() => pick(0)} activeOpacity={0.7}>
              <Text style={[styles.rowText, { color: c.textMuted }]}>{t('campus_program_none')}</Text>
              {(!selectedId || selectedId === 0) && <Ionicons name="checkmark" size={20} color={c.primary} />}
            </TouchableOpacity>
          }
          renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => pick(item.id)} activeOpacity={0.7}>
              <View style={styles.rowBody}>
                <Text style={styles.rowText}>{language === 'de' ? item.de : item.en}</Text>
                {!!item.degree && <Text style={styles.degree}>{item.degree}</Text>}
              </View>
              {selectedId === item.id && <Ionicons name="checkmark" size={20} color={c.primary} />}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </Modal>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10,
  },
  title: { ...c.type.title, color: c.text },
  search: {
    marginHorizontal: 16, marginBottom: 8, height: 44,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: c.radius.md,
    paddingHorizontal: 12, ...c.type.body, color: c.text,
  },
  listContent: { paddingBottom: 32 },
  section: {
    ...c.type.label, fontFamily: c.fonts.bodySemiBold, color: c.textSecondary,
    marginTop: 16, marginBottom: 4, paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  rowBody: { flex: 1 },
  rowText: { ...c.type.body, color: c.text },
  degree: { ...c.type.caption, color: c.textMuted, marginTop: 1 },
});
