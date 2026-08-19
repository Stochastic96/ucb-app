import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { useMotion } from '../../theme/MotionProvider';
import { withAlpha } from '../../constants/colors';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import useStore from '../../store/useStore';
import ProgramPickerModal from '../../components/ProgramPickerModal';
import LanguagePickerModal from '../../components/LanguagePickerModal';
import { saveProfile, clampProfile, OPEN_TO, getLanguageLabel, normalizeTag } from '../../services/campusProfile';
import { getProgramLabel, getProgramDegree } from '../../services/campusPrograms';

// First-run Campus Radar onboarding: consent → identity → studies → social →
// visibility. Everything here is SELF-AUTHORED (nothing read from Stud.IP);
// the real name is local-only and shared per-chat, never broadcast.
const STEP_CONSENT = 0;
const STEP_IDENTITY = 1;
const STEP_STUDIES = 2;
const STEP_SOCIAL = 3;
const STEP_VISIBILITY = 4;
const STEP_COUNT = 5;

const SUGGESTED = ['coffee', 'football', 'music', 'coding', 'hiking', 'gaming', 'languages', 'cooking', 'photography', 'art', 'gym', 'films'];
const MAX_INTERESTS = 12;
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function CampusOnboardingScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { timing } = useMotion();
  const language = useStore((s) => s.language);
  const campusProfile = useStore((s) => s.campusProfile);
  const setCampusProfile = useStore((s) => s.setCampusProfile);

  const [startStep, setStartStep] = useState(STEP_CONSENT);
  const [step, setStep] = useState(STEP_CONSENT);

  // Profile draft — prefilled when a (partial) profile already exists.
  const [username, setUsername] = useState(campusProfile?.username ?? '');
  const [realName, setRealName] = useState(campusProfile?.realName ?? '');
  const [origin, setOrigin] = useState(campusProfile?.origin ?? 'INT');
  const [programId, setProgramId] = useState(campusProfile?.programId ?? 0);
  const [semester, setSemester] = useState(campusProfile?.semester ?? 0);
  const [openTo, setOpenTo] = useState(campusProfile?.openTo ?? []);
  const [speak, setSpeak] = useState(campusProfile?.speak ?? []);
  const [learn, setLearn] = useState(campusProfile?.learn ?? []);
  const [interests, setInterests] = useState(campusProfile?.interests ?? []);

  const [programOpen, setProgramOpen] = useState(false);
  const [speakOpen, setSpeakOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      // Consent already recorded (e.g. profile was created pre-onboarding and
      // the user is finishing missing fields) → skip the consent step.
      try {
        const consented = await AsyncStorage.getItem(STORAGE_KEYS.CAMPUS_CONSENT);
        if (consented) {
          setStartStep(STEP_IDENTITY);
          setStep(STEP_IDENTITY);
        }
      } catch {}
    })();
  }, []);

  // Slide+fade each step in (collapses to an instant snap under Reduce Motion).
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: timing.duration, useNativeDriver: true }).start();
  }, [step]);

  const canContinue = step !== STEP_IDENTITY || username.trim().length >= 2;

  const goBack = () => {
    if (step > startStep) setStep(step - 1);
    else navigation.goBack();
  };

  const onContinue = async () => {
    if (step === STEP_CONSENT) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.CAMPUS_CONSENT, String(Date.now()));
      } catch {}
      setStep(STEP_IDENTITY);
      return;
    }
    if (step < STEP_VISIBILITY) {
      setStep(step + 1);
      return;
    }
    const clean = clampProfile({ username, realName, status: campusProfile?.status ?? '', origin, interests, programId, semester, openTo, speak, learn });
    await saveProfile(clean);
    setCampusProfile(clean);
    navigation.goBack();
  };

  const toggleOpenTo = (key) =>
    setOpenTo((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleInterest = (tag) => {
    const n = normalizeTag(tag);
    if (!n) return;
    setInterests((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length >= MAX_INTERESTS ? prev : [...prev, n]
    );
  };

  const langNames = (ids) => ids.map((id) => getLanguageLabel(id, language)).join(', ');

  const continueLabel =
    step === STEP_CONSENT ? t('campus_consent_accept') : step === STEP_VISIBILITY ? t('campus_onb_done') : t('campus_onb_continue');

  const stepBody = useMemo(() => {
    switch (step) {
      case STEP_CONSENT:
        return (
          <View style={styles.centerStep}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark-outline" size={40} color={c.primary} />
            </View>
            <Text style={styles.stepTitle}>{t('campus_consent_title')}</Text>
            <Text style={styles.stepSub}>{t('campus_consent_body')}</Text>
            <View style={styles.safetyBox}>
              <Text style={styles.safetyText}>{t('campus_consent_safety')}</Text>
            </View>
          </View>
        );

      case STEP_IDENTITY:
        return (
          <View>
            <Text style={styles.stepTitle}>{t('campus_identity_title')}</Text>
            <Text style={styles.stepSub}>{t('campus_identity_sub')}</Text>

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
          </View>
        );

      case STEP_STUDIES:
        return (
          <View>
            <Text style={styles.stepTitle}>{t('campus_studies_title')}</Text>
            <Text style={styles.stepSub}>{t('campus_studies_sub')}</Text>

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
            <Text style={styles.hint}>{t('campus_studies_hint')}</Text>
          </View>
        );

      case STEP_SOCIAL:
        return (
          <View>
            <Text style={styles.stepTitle}>{t('campus_social_title')}</Text>
            <Text style={styles.stepSub}>{t('campus_social_sub')}</Text>

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
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case STEP_VISIBILITY:
      default:
        return (
          <View style={styles.centerStep}>
            <View style={styles.heroIcon}>
              <Ionicons name="eye-off-outline" size={40} color={c.primary} />
            </View>
            <Text style={styles.stepTitle}>{t('campus_visibility_title')}</Text>
            <Text style={styles.stepSub}>{t('campus_visibility_sub')}</Text>
            <View style={styles.privacyBox}>
              <Ionicons name="leaf-outline" size={14} color={c.primary} />
              <Text style={styles.privacyText}>{t('campus_serverless_note')}</Text>
            </View>
          </View>
        );
    }
  }, [step, styles, c, t, username, realName, origin, programId, semester, openTo, speak, learn, interests, language]);

  const dots = [];
  for (let i = startStep; i < STEP_COUNT; i++) dots.push(i);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={styles.dots}>
          {dots.map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
          ))}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View
          style={{
            opacity: anim,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          {stepBody}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canContinue && styles.nextBtnDisabled]}
          onPress={onContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>{continueLabel}</Text>
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
  flex: { flex: 1, backgroundColor: c.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  dotActive: { backgroundColor: c.primary, width: 20 },
  dotDone: { backgroundColor: withAlpha(c.primary, '77') },
  content: { padding: 20, paddingBottom: 32 },
  centerStep: { alignItems: 'center', paddingTop: 24 },
  heroIcon: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: withAlpha(c.primary, '18'),
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  stepTitle: { ...c.type.titleLg, color: c.text, textAlign: 'center', marginBottom: 8 },
  stepSub: { ...c.type.bodySm, color: c.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  safetyBox: {
    backgroundColor: c.warningSurface, borderRadius: c.radius.md, padding: 12, marginTop: 8,
  },
  safetyText: { ...c.type.caption, color: c.onWarning, lineHeight: 18, textAlign: 'center' },
  privacyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: withAlpha(c.primary, '14'), borderRadius: c.radius.md,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 8,
  },
  privacyText: { ...c.type.caption, color: c.textSecondary, flex: 1, lineHeight: 17 },
  label: { ...c.type.label, fontFamily: c.fonts.bodySemiBold, color: c.text, marginTop: 18, marginBottom: 6 },
  input: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: c.radius.md,
    paddingHorizontal: 12, height: 46, ...c.type.body, color: c.text,
  },
  hint: { ...c.type.caption, color: c.textMuted, marginTop: 6 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1, height: 46, borderRadius: c.radius.md, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: withAlpha(c.primary, '18'), borderColor: c.primary },
  segmentText: { ...c.type.bodySm, color: c.textSecondary },
  segmentTextActive: { color: c.primary, fontFamily: c.fonts.bodySemiBold },
  pickerField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: c.radius.md,
    paddingHorizontal: 12, paddingVertical: 12, minHeight: 46,
  },
  pickerValue: { ...c.type.body, color: c.text },
  pickerPlaceholder: { ...c.type.body, color: c.textMuted },
  pickerCaption: { ...c.type.caption, color: c.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { ...c.type.bodySm, color: c.textSecondary },
  chipTextActive: { color: c.onPrimary, fontFamily: c.fonts.bodySemiBold },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  nextBtn: { height: 50, borderRadius: c.radius.lg, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { ...c.type.bodyStrong, color: c.onPrimary },
});
