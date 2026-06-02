import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../../store/useStore';
import { BG, INACTIVE, BORDER, FACT_CATEGORY_COLORS } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';
import { trackScreen, trackEvent } from '../../services/analytics';
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
  const lang = useStore((s) => s.language);

  const [factState, setFactState] = useState(null);
  const [currentFact, setCurrentFact] = useState(() => getDailyFact());
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  // Card entrance animation (opacity + lift + scale), re-run on every new fact.
  const anim = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => { trackScreen('FactScreen'); }, []));

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
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentFact.id, anim]);

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
    trackEvent('feature_use', 'fact_revealed', { reveal_count: state.revealCount });
  }, [factState]);

  const openSource = useCallback(() => {
    trackEvent('feature_use', 'fact_source_opened', { fact_id: currentFact.id });
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

            <TouchableOpacity style={styles.sourceRow} onPress={openSource} activeOpacity={0.7}>
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
                    { backgroundColor: i < remaining ? accent : BORDER },
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
            >
              <Ionicons name="shuffle" size={18} color="#fff" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardBody: { padding: 20 },
  hook: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', lineHeight: 29 },
  factText: { fontSize: 15.5, color: '#42505C', lineHeight: 23, marginTop: 12 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  sourceText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotsLabel: { marginLeft: 6, fontSize: 13, color: INACTIVE, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  lockedCard: {
    backgroundColor: '#F4F7FB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  lockedTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  lockedMsg: { fontSize: 14, color: '#506070', marginTop: 5, lineHeight: 20 },
});
