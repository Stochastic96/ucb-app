import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { useTranslation } from '../services/i18n';
import { withAlpha } from '../constants/colors';
import ListRow from './ListRow';
import {
  FIRST_STEP_IDS,
  loadFirstSteps,
  markFirstStepDone,
  dismissFirstSteps,
  isFirstStepsComplete,
} from '../services/firstSteps';

// Post-login half of onboarding: a quiet, dismissible checklist that walks a
// new student through the app's core tools at their own pace (progress-visible
// checklists reliably out-perform one-shot feature tours). State is local-only.
const STEP_META = {
  timetable: { icon: 'calendar-outline', labelKey: 'fs_timetable' },
  mensa: { icon: 'restaurant-outline', labelKey: 'fs_mensa' },
  guide: { icon: 'book-outline', labelKey: 'fs_guide' },
  map: { icon: 'map-outline', labelKey: 'fs_map' },
  planner: { icon: 'checkmark-circle-outline', labelKey: 'fs_planner' },
};

export default function GettingStartedCard({ onStep }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [state, setState] = useState(null);

  // Re-read on every Home focus so steps completed elsewhere tick off on return.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadFirstSteps().then((s) => alive && setState(s));
      return () => { alive = false; };
    }, [])
  );

  if (!state || isFirstStepsComplete(state)) return null;

  const doneCount = state.done.length;
  const progress = doneCount / FIRST_STEP_IDS.length;

  const openStep = async (id) => {
    const next = await markFirstStepDone(id);
    setState(next);
    onStep?.(id);
  };

  const dismiss = async () => setState(await dismissFirstSteps());

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{t('fs_title')}</Text>
          <Text style={styles.sub}>{t('fs_sub', { done: doneCount, total: FIRST_STEP_IDS.length })}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={10} accessibilityLabel={t('fs_dismiss')}>
          <Ionicons name="close" size={18} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(progress * 100, 4)}%` }]} />
      </View>

      {FIRST_STEP_IDS.map((id) => {
        const done = state.done.includes(id);
        const meta = STEP_META[id];
        return (
          <ListRow
            key={id}
            compact
            icon={meta.icon}
            iconColor={done ? { bg: withAlpha(c.primary, '14'), icon: c.primary } : { bg: c.surfaceAlt, icon: c.textSecondary }}
            title={t(meta.labelKey)}
            onPress={() => openStep(id)}
            right={
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={done ? c.primary : c.border}
              />
            }
          />
        );
      })}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: c.surface,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 14,
    borderRadius: c.radius.lg,
    ...c.shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  title: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text },
  sub: { ...c.type.caption, color: c.textMuted, marginTop: 1 },
  track: { height: 5, borderRadius: 3, backgroundColor: c.surfaceAlt, marginBottom: 8, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: c.primary },
});
