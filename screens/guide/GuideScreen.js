import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../../components/SearchBar';
import { trackScreen, trackEvent } from '../../services/analytics';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import buildings from '../../data/buildings.json';
import checklist from '../../data/guide_checklist.json';
import offices from '../../data/guide_offices.json';
import glossary from '../../data/guide_glossary.json';
import phrases from '../../data/guide_phrases.json';
import faq from '../../data/guide_faq.json';
import contacts from '../../data/guide_contacts.json';
import emergency from '../../data/guide_emergency.json';

const CATEGORY_COLORS = {
  emergency: '#D32F2F',
  buildings: '#1565C0',
  checklist: '#2E7D32',
  offices: '#6A1B9A',
  contacts: '#00695C',
  glossary: '#E65100',
  phrases: '#AD1457',
  faq: '#4527A0',
  work: '#1976D2',
  health: '#00838F',
  accommodation: '#5D4037',
  bureaucracy: '#37474F',
  language: '#7B1FA2',
  rights: '#EF6C00',
};

export default function GuideScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');

  useEffect(() => { trackScreen('GuideScreen'); }, []);

  const categories = [
    { id: 'emergency', icon: 'alert-circle-outline', label: t('guide_cat_emergency'), count: emergency.length, desc: t('guide_cat_emergency_desc') },
    { id: 'buildings', icon: 'home-outline', label: t('guide_cat_buildings'), count: buildings.length, desc: t('guide_cat_buildings_desc') },
    { id: 'checklist', icon: 'checkbox-outline', label: t('guide_cat_checklist'), count: checklist.length, desc: t('guide_cat_checklist_desc') },
    { id: 'offices', icon: 'business-outline', label: t('guide_cat_offices'), count: offices.length, desc: t('guide_cat_offices_desc') },
    { id: 'contacts', icon: 'person-outline', label: t('guide_cat_contacts'), count: contacts.length, desc: t('guide_cat_contacts_desc') },
    { id: 'glossary', icon: 'book-outline', label: t('guide_cat_glossary'), count: glossary.length, desc: t('guide_cat_glossary_desc') },
    { id: 'phrases', icon: 'chatbubble-outline', label: t('guide_cat_phrases'), count: phrases.length, desc: t('guide_cat_phrases_desc') },
    { id: 'faq', icon: 'help-circle-outline', label: t('guide_cat_faq'), count: faq.length, desc: t('guide_cat_faq_desc') },
    { id: 'work', icon: 'briefcase-outline', label: t('guide_cat_work'), count: 6, desc: t('guide_cat_work_desc') },
    { id: 'health', icon: 'medical-outline', label: t('guide_cat_health'), count: 6, desc: t('guide_cat_health_desc') },
    { id: 'accommodation', icon: 'bed-outline', label: t('guide_cat_accommodation'), count: 5, desc: t('guide_cat_accommodation_desc') },
    { id: 'bureaucracy', icon: 'document-text-outline', label: t('guide_cat_bureaucracy'), count: 7, desc: t('guide_cat_bureaucracy_desc') },
    { id: 'language', icon: 'language-outline', label: t('guide_cat_language'), count: 4, desc: t('guide_cat_language_desc') },
    { id: 'rights', icon: 'shield-checkmark-outline', label: t('guide_cat_rights'), count: 4, desc: t('guide_cat_rights_desc') },
  ];

  const visibleCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleCategories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>{t('guide_title')}</Text>
              <Text style={styles.heroSub}>{t('guide_subtitle')}</Text>
            </View>
            <View style={styles.searchWrapper}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={t('guide_search_placeholder')}
              />
            </View>
            {!query.trim() && <DisclaimerBanner t={t} />}
            <Text style={styles.sectionLabel}>{t('guide_topics')}</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('guide_no_results', { query })}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = CATEGORY_COLORS[item.id] ?? c.primary;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                trackEvent('feature_use', 'guide_category_opened', { category: item.id });
                navigation.push('GuideDetail', { category: item.id, title: item.label, titleKey: `guide_cat_${item.id}` });
              }}
              activeOpacity={0.75}
              accessibilityLabel={`${item.label}: ${item.desc}`}
              accessibilityRole="button"
            >
              <View style={[styles.iconBox, { backgroundColor: c.mode === 'dark' ? color + '25' : color + '15' }]}>
                <Ionicons name={item.icon} size={24} color={c.mode === 'dark' ? color + 'DF' : color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.count}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function DisclaimerBanner({ t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={18} color={c.mode === 'dark' ? c.warning : '#795548'} style={{ marginRight: 6, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.disclaimerTitle}>{t('guide_disclaimer_title')}</Text>
        <Text style={styles.disclaimerText}>{t('guide_disclaimer_text')}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  listContent: { paddingBottom: 40 },
  hero: {
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: c.text },
  heroSub: { fontSize: 13, color: c.textMuted, marginTop: 3 },
  searchWrapper: { marginHorizontal: 12, marginBottom: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: c.textMuted, fontSize: 14 },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: c.mode === 'dark' ? c.warning + '15' : '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.mode === 'dark' ? c.warning + '30' : '#FFE082',
  },
  disclaimerTitle: { fontSize: 12, fontWeight: '700', color: c.mode === 'dark' ? c.warning : '#795548', marginBottom: 3 },
  disclaimerText: { fontSize: 11, color: c.mode === 'dark' ? c.textSecondary : '#795548', lineHeight: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 14,
    elevation: 2,
    shadowColor: c.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: { width: 48, height: 48, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: c.text },
  desc: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: c.surfaceSunken, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
});
