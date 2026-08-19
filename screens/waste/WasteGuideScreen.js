import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import useStore from '../../store/useStore';
import useReducedMotion from '../../hooks/useReducedMotion';
import SearchBar from '../../components/SearchBar';
import {
  getAllBins,
  getBinById,
  getBinCopy,
  getWasteItemCopy,
  getVariantLabel,
  searchWasteItems,
} from '../../services/waste';

// ─────────────────────────────────────────────────────────────────────────
// Waste Guide — "where does it go?" for Landkreis Birkenfeld.
// Search-first over a curated, fully-offline list: typing shows live results;
// tapping one floods the screen with the bin's real-world colour. No query →
// browsable bin tiles. No camera/scanner — just authoritative text search.
// ─────────────────────────────────────────────────────────────────────────

export default function WasteGuideScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const language = useStore((s) => s.language);
  const reducedMotion = useReducedMotion();

  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBin, setSelectedBin] = useState(null);

  const answerAnim = useRef(new Animated.Value(0)).current;

  const results = useMemo(() => searchWasteItems(query), [query]);

  const openItem = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedItem(item);
    answerAnim.setValue(reducedMotion ? 1 : 0);
    if (!reducedMotion) {
      Animated.spring(answerAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();
    }
  };

  const renderResult = ({ item }) => {
    const copy = getWasteItemCopy(item, language);
    const bin = getBinById(item.bin);
    const binCopy = getBinCopy(bin, language);
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => openItem(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${copy.name}: ${binCopy.name}`}
      >
        <Text style={styles.resultEmoji}>{item.emoji}</Text>
        <View style={styles.resultText}>
          <Text style={styles.resultName} numberOfLines={1}>{copy.name}</Text>
          {item.variants ? (
            <Text style={styles.resultBinLabel} numberOfLines={1}>
              {item.variants
                .map((v) => getBinCopy(getBinById(v.bin), language).name)
                .join(' / ')}
            </Text>
          ) : (
            <Text style={[styles.resultBinLabel, { color: bin.color }]} numberOfLines={1}>
              {binCopy.name}
            </Text>
          )}
        </View>
        <View style={[styles.resultDot, { backgroundColor: bin.color }]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heroTitle}>{t('waste_hero_title')}</Text>
        <Text style={styles.heroSub}>{t('waste_hero_sub')}</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('waste_search_placeholder')}
        />
      </View>

      {query.trim().length === 0 ? (
        <ScrollView contentContainerStyle={styles.tilesContent}>
          <Text style={styles.sectionLabel}>{t('waste_bins_title')}</Text>
          <View style={styles.tilesGrid}>
            {getAllBins().map((bin) => {
              const binCopy = getBinCopy(bin, language);
              return (
                <TouchableOpacity
                  key={bin.id}
                  style={[styles.binTile, { backgroundColor: bin.color }]}
                  onPress={() => setSelectedBin(bin)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${binCopy.name}: ${binCopy.tagline}`}
                >
                  <Ionicons name={bin.icon} size={26} color={bin.onColor} />
                  <Text style={[styles.binTileName, { color: bin.onColor }]} numberOfLines={1}>
                    {binCopy.name}
                  </Text>
                  <Text style={[styles.binTileTagline, { color: bin.onColor }]} numberOfLines={2}>
                    {binCopy.tagline}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.disclaimer}>{t('waste_disclaimer')}</Text>
        </ScrollView>
      ) : results.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🤔</Text>
          <Text style={styles.emptyTitle}>{t('waste_no_results', { query: query.trim() })}</Text>
          <Text style={styles.emptyHint}>{t('waste_no_results_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── Answer card: full-colour takeover ─────────────────────────── */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (() => {
          const item = selectedItem;
          const copy = getWasteItemCopy(item, language);
          const bin = getBinById(item.bin);
          const binCopy = getBinCopy(bin, language);
          const on = bin.onColor;
          return (
            <View style={[styles.answerBackdrop, { backgroundColor: bin.color }]}>
              <Animated.View
                style={[
                  styles.answerBody,
                  {
                    opacity: answerAnim,
                    transform: [{
                      scale: answerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
                    }],
                  },
                ]}
              >
                <ScrollView
                  contentContainerStyle={styles.answerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.answerEmoji}>{item.emoji}</Text>
                  <Text style={[styles.answerItemName, { color: on }]}>{copy.name}</Text>

                  <Text style={[styles.answerGoesTo, { color: on }]}>{t('waste_goes_to')}</Text>
                  <Text style={[styles.answerBinName, { color: on }]}>{binCopy.name}</Text>
                  {binCopy.name !== binCopy.nativeName && (
                    <Text style={[styles.answerNativeName, { color: on }]}>{binCopy.nativeName}</Text>
                  )}

                  {item.variants && (
                    <View style={styles.variantsRow}>
                      {item.variants.map((variant, index) => {
                        const vBin = getBinById(variant.bin);
                        return (
                          <View key={index} style={[styles.variantCard, { backgroundColor: vBin.color }]}>
                            <Text style={[styles.variantLabel, { color: vBin.onColor }]}>
                              {getVariantLabel(variant, language)}
                            </Text>
                            <Text style={[styles.variantBin, { color: vBin.onColor }]}>
                              {getBinCopy(vBin, language).name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <Text style={[styles.answerWhy, { color: on }]}>{copy.why}</Text>

                  {copy.caution && (
                    <View style={styles.cautionBox}>
                      <Ionicons name="alert-circle-outline" size={18} color={on} />
                      <Text style={[styles.cautionText, { color: on }]}>{copy.caution}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.binDetailsBtn}
                    onPress={() => { setSelectedItem(null); setSelectedBin(bin); }}
                    accessibilityRole="button"
                  >
                    <Ionicons name={bin.icon} size={16} color={on} />
                    <Text style={[styles.binDetailsBtnText, { color: on }]}>{t('waste_bin_details')}</Text>
                  </TouchableOpacity>
                </ScrollView>

                <TouchableOpacity
                  style={styles.answerClose}
                  onPress={() => setSelectedItem(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('waste_close')}
                >
                  <Ionicons name="close" size={26} color={on} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        })()}
      </Modal>

      {/* ── Bin detail sheet ──────────────────────────────────────────── */}
      <Modal
        visible={!!selectedBin}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBin(null)}
      >
        {selectedBin && (() => {
          const bin = selectedBin;
          const binCopy = getBinCopy(bin, language);
          return (
            <View style={styles.sheetBackdrop}>
              <TouchableOpacity
                style={styles.sheetDismiss}
                onPress={() => setSelectedBin(null)}
                accessibilityLabel={t('waste_close')}
              />
              <View style={styles.sheet}>
                <View style={[styles.sheetHeader, { backgroundColor: bin.color }]}>
                  <View style={styles.sheetHandle} />
                  <Ionicons name={bin.icon} size={30} color={bin.onColor} />
                  <Text style={[styles.sheetTitle, { color: bin.onColor }]}>{binCopy.name}</Text>
                  <Text style={[styles.sheetTagline, { color: bin.onColor }]}>{binCopy.tagline}</Text>
                  <TouchableOpacity
                    style={styles.sheetClose}
                    onPress={() => setSelectedBin(null)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('waste_close')}
                  >
                    <Ionicons name="close" size={24} color={bin.onColor} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.sheetContent}>
                  <Text style={styles.sheetSection}>{t('waste_belongs')}</Text>
                  {binCopy.belongs.map((line, index) => (
                    <View key={index} style={styles.sheetLine}>
                      <Ionicons name="checkmark-circle" size={16} color={bin.color} />
                      <Text style={styles.sheetLineText}>{line}</Text>
                    </View>
                  ))}
                  <Text style={styles.sheetSection}>{t('waste_never')}</Text>
                  {binCopy.never.map((line, index) => (
                    <View key={index} style={styles.sheetLine}>
                      <Ionicons name="close-circle" size={16} color={c.error} />
                      <Text style={styles.sheetLineText}>{line}</Text>
                    </View>
                  ))}
                  <Text style={styles.sheetSection}>{t('waste_howto')}</Text>
                  <Text style={styles.sheetHowto}>{binCopy.howto}</Text>
                </ScrollView>
              </View>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  heroTitle: { ...c.type.titleLg, color: c.text },
  heroSub: { ...c.type.bodySm, color: c.textMuted, marginTop: 3, marginBottom: 12 },

  // Bin tiles (empty query)
  tilesContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    ...c.type.label,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  binTile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 104,
    justifyContent: 'flex-start',
  },
  binTileName: { ...c.type.bodyStrong, fontFamily: c.fonts.bodyBold, marginTop: 8 },
  binTileTagline: { ...c.type.micro, fontFamily: c.fonts.body, marginTop: 2, opacity: 0.85 },
  disclaimer: { ...c.type.micro, fontFamily: c.fonts.body, color: c.textFaint, marginTop: 18, lineHeight: 16 },

  // Results
  resultsContent: { padding: 12, paddingBottom: 40 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: c.radius.lg,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    ...c.shadows.card,
  },
  resultEmoji: { fontSize: 26 },
  resultText: { flex: 1 },
  resultName: { ...c.type.bodyStrong, fontFamily: c.fonts.bodyBold, color: c.text },
  resultBinLabel: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, marginTop: 2, color: c.textMuted },
  resultDot: { width: 14, height: 14, borderRadius: 7 },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { ...c.type.heading, color: c.text, textAlign: 'center' },
  emptyHint: { ...c.type.bodySm, color: c.textMuted, textAlign: 'center', marginTop: 6 },

  // Answer card
  answerBackdrop: { flex: 1 },
  answerBody: { flex: 1 },
  answerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  answerEmoji: { fontSize: 56, marginBottom: 10 },
  answerItemName: { ...c.type.titleLg, fontSize: 20, textAlign: 'center', opacity: 0.9 },
  answerGoesTo: {
    ...c.type.label,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 26,
    opacity: 0.8,
  },
  answerBinName: { fontFamily: c.fonts.display, fontSize: 34, textAlign: 'center', marginTop: 4 },
  answerNativeName: { ...c.type.bodyStrong, marginTop: 2, opacity: 0.85 },
  variantsRow: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  variantCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  variantLabel: { ...c.type.caption, fontFamily: c.fonts.bodyBold },
  variantBin: { ...c.type.caption, marginTop: 3, opacity: 0.9 },
  answerWhy: { ...c.type.body, textAlign: 'center', marginTop: 22, opacity: 0.95 },
  cautionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  cautionText: { ...c.type.bodySm, flex: 1 },
  binDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 26,
  },
  binDetailsBtnText: { ...c.type.label, fontSize: 14 },
  answerClose: { position: 'absolute', top: 54, right: 22 },

  // Bin sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetDismiss: { flex: 1 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  sheetHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 20 },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginBottom: 12,
  },
  sheetTitle: { ...c.type.titleLg, fontSize: 20, marginTop: 6 },
  sheetTagline: { ...c.type.bodySm, marginTop: 2, opacity: 0.9, textAlign: 'center' },
  sheetClose: { position: 'absolute', top: 14, right: 16 },
  sheetContent: { padding: 18, paddingBottom: 40 },
  sheetSection: {
    ...c.type.label,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  sheetLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 7 },
  sheetLineText: { ...c.type.bodySm, fontSize: 14, flex: 1, color: c.text },
  sheetHowto: { ...c.type.bodySm, fontSize: 14, color: c.text, lineHeight: 21 },
});
