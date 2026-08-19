import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { withAlpha } from '../../constants/colors';
import useStore from '../../store/useStore';
import ProgramPickerModal from '../../components/ProgramPickerModal';
import LanguagePickerModal from '../../components/LanguagePickerModal';
import { saveProfile, clampProfile, isProfileComplete, normalizeTag, OPEN_TO, getLanguageLabel } from '../../services/campusProfile';
import { getProgramLabel, getProgramDegree } from '../../services/campusPrograms';

const SUGGESTED = ['coffee', 'football', 'music', 'coding', 'hiking', 'gaming', 'languages', 'cooking', 'photography', 'art', 'gym', 'films'];
const MAX_INTERESTS = 12;
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function ProfileEditScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const language = useStore((s) => s.language);
  const campusProfile = useStore((s) => s.campusProfile);
  const setCampusProfile = useStore((s) => s.setCampusProfile);

  const [username, setUsername] = useState(campusProfile?.username ?? '');
  const [realName, setRealName] = useState(campusProfile?.realName ?? '');
  const [status, setStatus] = useState(campusProfile?.status ?? '');
  const [origin, setOrigin] = useState(campusProfile?.origin ?? 'DE');
  const [programId, setProgramId] = useState(campusProfile?.programId ?? 0);
  const [semester, setSemester] = useState(campusProfile?.semester ?? 0);
  const [openTo, setOpenTo] = useState(campusProfile?.openTo ?? []);
  const [speak, setSpeak] = useState(campusProfile?.speak ?? []);
  const [learn, setLearn] = useState(campusProfile?.learn ?? []);
  const [interests, setInterests] = useState(campusProfile?.interests ?? []);
  const [draft, setDraft] = useState('');

  const [programOpen, setProgramOpen] = useState(false);
  const [speakOpen, setSpeakOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);


  const toggleOpenTo = (key) =>
    setOpenTo((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const langNames = (ids) => ids.map((id) => getLanguageLabel(id, language)).join(', ');

  const toggleInterest = (tag) => {
    const n = normalizeTag(tag);
    if (!n) return;
    setInterests((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length >= MAX_INTERESTS ? prev : [...prev, n]
    );
  };

  const addDraft = () => {
    if (draft.trim()) toggleInterest(draft);
    setDraft('');
  };

  const onSave = async () => {
    const clean = clampProfile({ username, realName, status, origin, interests, programId, semester, openTo, speak, learn });
    await saveProfile(clean);
    setCampusProfile(clean);
    navigation.goBack();
  };

  const canSave = isProfileComplete({ username });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>{t('campus_profile_intro')}</Text>

        <Text style={styles.label}>{t('campus_username')}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder={t('campus_username_ph')}
          placeholderTextColor={c.textMuted}
          maxLength={16}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>{t('campus_username_hint')}</Text>

        <Text style={styles.label}>{t('campus_real_name')}</Text>
        <TextInput
          style={styles.input}
          value={realName}
          onChangeText={setRealName}
          placeholder={t('campus_real_name_ph')}
          placeholderTextColor={c.textMuted}
          maxLength={40}
        />
        <View style={styles.privacyBox}>
          <Ionicons name="lock-closed-outline" size={14} color={c.primary} />
          <Text style={styles.privacyText}>{t('campus_real_name_hint')}</Text>
        </View>

        <Text style={styles.label}>{t('campus_status')}</Text>
        <TextInput
          style={styles.input}
          value={status}
          onChangeText={setStatus}
          placeholder={t('campus_status_ph')}
          placeholderTextColor={c.textMuted}
          maxLength={24}
        />

        <Text style={styles.label}>{t('campus_origin')}</Text>
        <View style={styles.segment}>
          {['DE', 'INT'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.segmentBtn, origin === opt && styles.segmentBtnActive]}
              onPress={() => setOrigin(opt)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, origin === opt && styles.segmentTextActive]}>
                {opt === 'DE' ? t('campus_origin_de_full') : t('campus_origin_int_full')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>{t('campus_origin_hint')}</Text>

        <Text style={styles.label}>{t('campus_program')}</Text>
        <TouchableOpacity style={styles.pickerField} onPress={() => setProgramOpen(true)} activeOpacity={0.7}>
          <View style={styles.flex}>
            <Text style={programId ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={2}>
              {programId ? getProgramLabel(programId, language) : t('campus_program_ph')}
            </Text>
            {!!programId && !!getProgramDegree(programId) && (
              <Text style={styles.pickerCaption}>{getProgramDegree(programId)}</Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={18} color={c.textMuted} />
        </TouchableOpacity>
        <Text style={styles.hint}>{t('campus_studies_hint')}</Text>

        <Text style={styles.label}>{t('campus_semester')}</Text>
        <View style={styles.chips}>
          {SEMESTERS.map((n) => {
            const active = semester === n;
            return (
              <TouchableOpacity
                key={n}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSemester(active ? 0 : n)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{n === 9 ? '9+' : n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t('campus_open_to')}</Text>
        <View style={styles.chips}>
          {OPEN_TO.map(({ key, icon }) => {
            const active = openTo.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleOpenTo(key)}
                activeOpacity={0.8}
              >
                <Ionicons name={icon} size={13} color={active ? c.onPrimary : c.textSecondary} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`campus_open_${key}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t('campus_langs_speak')}</Text>
        <TouchableOpacity style={styles.pickerField} onPress={() => setSpeakOpen(true)} activeOpacity={0.7}>
          <Text style={speak.length ? styles.pickerValue : styles.pickerPlaceholder}>
            {speak.length ? langNames(speak) : t('campus_langs_ph')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={c.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>{t('campus_langs_learn')}</Text>
        <TouchableOpacity style={styles.pickerField} onPress={() => setLearnOpen(true)} activeOpacity={0.7}>
          <Text style={learn.length ? styles.pickerValue : styles.pickerPlaceholder}>
            {learn.length ? langNames(learn) : t('campus_langs_ph')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={c.textMuted} />
        </TouchableOpacity>
        <Text style={styles.hint}>{t('campus_langs_hint')}</Text>

        <Text style={styles.label}>{t('campus_interests')} ({interests.length}/{MAX_INTERESTS})</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('campus_interests_ph')}
            placeholderTextColor={c.textMuted}
            maxLength={20}
            autoCapitalize="none"
            onSubmitEditing={addDraft}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addDraft}>
            <Ionicons name="add" size={22} color={c.onPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.chips}>
          {Array.from(new Set([...interests, ...SUGGESTED])).map((tag) => {
            const active = interests.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleInterest(tag)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                {active && <Ionicons name="close" size={13} color={c.onPrimary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>{t('campus_save_profile')}</Text>
        </TouchableOpacity>
      </View>

      <ProgramPickerModal
        visible={programOpen}
        onClose={() => setProgramOpen(false)}
        selectedId={programId}
        onSelect={setProgramId}
      />
      <LanguagePickerModal
        visible={speakOpen}
        onClose={() => setSpeakOpen(false)}
        title={t('campus_langs_speak')}
        selectedIds={speak}
        onChange={setSpeak}
      />
      <LanguagePickerModal
        visible={learnOpen}
        onClose={() => setLearnOpen(false)}
        title={t('campus_langs_learn')}
        selectedIds={learn}
        onChange={setLearn}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 32 },
  intro: { ...c.type.bodySm, color: c.textSecondary, marginBottom: 16 },
  label: { ...c.type.label, fontFamily: c.fonts.bodySemiBold, color: c.text, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: c.radius.md,
    paddingHorizontal: 12,
    height: 46,
    ...c.type.body,
    color: c.text,
  },
  hint: { ...c.type.caption, color: c.textMuted, marginTop: 5 },
  privacyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: withAlpha(c.primary, '14'), borderRadius: c.radius.md,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 6,
  },
  privacyText: { ...c.type.caption, color: c.textSecondary, flex: 1, lineHeight: 17 },
  pickerField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: c.radius.md,
    paddingHorizontal: 12, paddingVertical: 12, minHeight: 46,
  },
  pickerValue: { ...c.type.body, color: c.text },
  pickerPlaceholder: { ...c.type.body, color: c.textMuted },
  pickerCaption: { ...c.type.caption, color: c.textMuted, marginTop: 2 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 46,
    borderRadius: c.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: withAlpha(c.primary, '18'), borderColor: c.primary },
  segmentText: { ...c.type.bodySm, color: c.textSecondary },
  segmentTextActive: { color: c.primary, fontFamily: c.fonts.bodySemiBold },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { width: 46, height: 46, borderRadius: c.radius.md, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { ...c.type.bodySm, color: c.textSecondary },
  chipTextActive: { color: c.onPrimary, fontFamily: c.fonts.bodySemiBold },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  saveBtn: { height: 50, borderRadius: c.radius.lg, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { ...c.type.bodyStrong, color: c.onPrimary },
});
