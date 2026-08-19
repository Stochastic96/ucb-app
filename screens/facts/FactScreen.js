import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../../store/useStore';
import { FACT_CATEGORY_COLORS } from '../../constants/colors';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import useReducedMotion from '../../hooks/useReducedMotion';
import { useTranslation } from '../../services/i18n';
import {
  MAX_REVEALS,
  getDailyFact,
  getFactCopy,
  loadFactState,
  saveFactState,
  markSeen,
  drawNextFact,
  revealsLeft,
  msUntilReset,
  formatCountdown,
} from '../../services/facts';

// Darken a #rrggbb hex by a 0–1 factor — used for the card's subtle gradient.
function darken(hex, factor = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function FactScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const lang = useStore((s) => s.language);

  const [factState, setFactState] = useState(null);
  const [currentFact, setCurrentFact] = useState(() => getDailyFact());
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  // Card entrance animation (opacity + lift + scale), re-run on every new fact.
  const anim = useRef(new Animated.Value(1)).current;


  // Load today's allowance and anchor on the deterministic fact of the day.
  useEffect(() => {
    let active = true;
    (async () => {
      const state = await loadFactState();
      const daily = getDailyFact();
      const seeded = markSeen(state, daily.id);
      if (!active) return;
      setFactState(seeded);
      setCurrentFact(daily);
      saveFactState(seeded);
    })();
    return () => { active = false; };
  }, []);

  // Animate the card in whenever the displayed fact changes.
  useEffect(() => {
    // Respect Reduce Motion: show the card immediately without the entrance animation.
    if (reducedMotion) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentFact.id, anim, reducedMotion]);

  // Keep the lock countdown fresh (updates every 30s while mounted).
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tickRef.current);
  }, []);

  const remaining = factState ? revealsLeft(factState) : MAX_REVEALS;
  const locked = remaining <= 0;
  const category = currentFact.category;
  const accent = FACT_CATEGORY_COLORS[category] ?? FACT_CATEGORY_COLORS.nature;
  const copy = getFactCopy(currentFact, lang);

  const cardStyle = {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  };

  const handleNext = useCallback(() => {
    if (!factState) return;
    if (revealsLeft(factState) <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    const { fact, state } = drawNextFact(factState);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCurrentFact(fact);
    setFactState(state);
    saveFactState(state);
  }, [factState]);

  const openSource = useCallback(() => {
    WebBrowser.openBrowserAsync(currentFact.source, { toolbarColor: accent }).catch(() => {});
  }, [currentFact, accent]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trivia card — re-animates each time the fact changes */}
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={[accent, darken(accent)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeader}
          >
            <Text style={styles.emoji}>{currentFact.emoji}</Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{t(`fact_cat_${category}`)}</Text>
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <Text style={styles.hook}>{copy.hook}</Text>
            <Text style={styles.factText}>{copy.fact}</Text>

            <TouchableOpacity style={styles.sourceRow} onPress={openSource} activeOpacity={0.7} accessibilityRole="link" accessibilityLabel={`${t('fact_source')}: ${currentFact.sourceName}`}>
              <Ionicons name="link-outline" size={15} color={accent} />
              <Text style={[styles.sourceText, { color: accent }]} numberOfLines={1}>
                {t('fact_source')}: {currentFact.sourceName}
              </Text>
              <Ionicons name="open-outline" size={14} color={accent} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer: reveal control + daily allowance, or the locked countdown */}
      <View style={styles.footer}>
        {!locked ? (
          <>
            <View style={styles.dotsRow}>
              {Array.from({ length: MAX_REVEALS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < remaining ? accent : c.border },
                  ]}
                />
              ))}
              <Text style={styles.dotsLabel}>
                {remaining === 1
                  ? t('fact_reveals_left_one')
                  : t('fact_reveals_left', { count: remaining, max: MAX_REVEALS })}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: accent }]}
              onPress={handleNext}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('fact_next')}
            >
              <Ionicons name="shuffle" size={18} color={c.onPrimary} />
              <Text style={styles.nextBtnText}>{t('fact_next')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>{t('fact_locked_title')}</Text>
            <Text style={styles.lockedMsg}>
              {t('fact_locked_msg', { time: formatCountdown(msUntilReset(new Date(now))) })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 22,
    overflow: 'hidden',
    ...c.shadows.raised,
  },
  cardHeader: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  emoji: { fontSize: 52, marginBottom: 14 },
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryChipText: {
    color: '#fff',
    ...c.type.caption,
    fontFamily: c.fonts.bodyBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardBody: { padding: 20 },
  hook: { ...c.type.titleLg, color: c.text },
  factText: { ...c.type.body, color: c.textSecondary, marginTop: 12 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  sourceText: { ...c.type.label, flexShrink: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotsLabel: { ...c.type.label, marginLeft: 6, color: c.textMuted },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  nextBtnText: { ...c.type.heading, fontFamily: c.fonts.bodyBold, color: c.onPrimary },
  lockedCard: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  lockedTitle: { ...c.type.heading, color: c.text },
  lockedMsg: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, marginTop: 5 },
});
