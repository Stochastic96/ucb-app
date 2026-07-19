import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import guideChecklist from '../../data/guide_checklist.json';
import guideOffices from '../../data/guide_offices.json';
import guideGlossary from '../../data/guide_glossary.json';
import guidePhrases from '../../data/guide_phrases.json';
import guideFaq from '../../data/guide_faq.json';
import guideContacts from '../../data/guide_contacts.json';
import guideEmergency from '../../data/guide_emergency.json';
import { Linking } from 'react-native';
import SearchBar from '../../components/SearchBar';
import { useTranslation } from '../../services/i18n';
import { getAllBuildings } from '../../services/buildings';
import InfoSectionView from './InfoSectionView';
import guideWork from '../../data/guide_work.json';
import guideHealth from '../../data/guide_health.json';
import guideAccommodation from '../../data/guide_accommodation.json';
import guideBureaucracy from '../../data/guide_bureaucracy.json';
import guideLanguage from '../../data/guide_language.json';
import guideRights from '../../data/guide_rights.json';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import AsyncStorageInstance from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const INFO_SECTIONS = {
  work: guideWork,
  health: guideHealth,
  accommodation: guideAccommodation,
  bureaucracy: guideBureaucracy,
  language: guideLanguage,
  rights: guideRights,
};

const CATEGORIES = {
  emergency: guideEmergency,
  buildings: getAllBuildings(),
  checklist: guideChecklist,
  offices: guideOffices,
  contacts: guideContacts,
  glossary: guideGlossary,
  phrases: guidePhrases,
  faq: guideFaq,
};

function EmptyState({ message }) {
  const t = useTranslation();
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
      <Ionicons name="search-outline" size={36} color={c.textMuted} />
      <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8 }}>{message ?? t('guide_detail_no_results')}</Text>
    </View>
  );
}

const CHECKLIST_STORAGE_KEY = STORAGE_KEYS.GUIDE_CHECKLIST;

export default function GuideDetailScreen({ route }) {
  const { category } = route.params ?? {};
  const data = CATEGORIES[category] ?? [];
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  // Checklist state — hoisted here to obey Rules of Hooks
  const [checked, setChecked] = useState({});
  // FAQ category filter — hoisted here to obey Rules of Hooks
  const [selectedFaqCat, setSelectedFaqCat] = useState('all');
  // Phrase copy feedback: stores the id of the last copied phrase briefly
  const [copiedId, setCopiedId] = useState(null);
  const t = useTranslation();

  // Load persisted checklist state on mount
  useEffect(() => {
    if (category !== 'checklist') return;
    AsyncStorageInstance.getItem(CHECKLIST_STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setChecked(JSON.parse(raw)); } catch {}
      }
    }).catch(() => {});
  }, [category]);

  const toggleChecked = (id) => {
    setChecked((s) => {
      const next = { ...s, [id]: !s[id] };
      AsyncStorageInstance.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((item) => {
      const text = JSON.stringify(item).toLowerCase();
      return text.includes(q);
    });
  }, [data, search]);

  const copyPhrase = async (id, german) => {
    await Clipboard.setStringAsync(german);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (INFO_SECTIONS[category]) {
    return <InfoSectionView data={INFO_SECTIONS[category]} />;
  }

  if (category === 'emergency') {
    return (
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyName}>{item.name}</Text>
            <Text style={styles.emergencyDesc}>{item.description}</Text>
            {item.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`).catch(() => {})} style={styles.linkRow}>
                <Ionicons name="call-outline" size={16} color={c.primary} style={{ marginRight: 4 }} />
                <Text style={styles.emergencyPhone}>{item.phone}</Text>
              </TouchableOpacity>
            )}
            {item.email && (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`).catch(() => {})} style={styles.linkRow}>
                <Ionicons name="mail-outline" size={16} color={c.primary} style={{ marginRight: 4 }} />
                <Text style={styles.emergencyEmail}>{item.email}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        style={styles.container}
      />
    );
  }

  if (category === 'contacts') {
    return (
      <View style={styles.container}>
        <View style={styles.searchWrapper}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('guide_search_contacts')} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactRole}>{item.role}</Text>
              <Text style={styles.contactOrg}>{item.organization}</Text>
              {item.office && <Text style={styles.contactOffice}>🏢 {item.office}</Text>}
              {item.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`).catch(() => {})} style={styles.linkRow}>
                  <Ionicons name="call-outline" size={16} color={c.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.contactEmail}>{item.phone}</Text>
                </TouchableOpacity>
              )}
              {item.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`).catch(() => {})} style={styles.linkRow}>
                  <Ionicons name="mail-outline" size={16} color={c.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.contactEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          style={styles.container}
        />
      </View>
    );
  }

  if (category === 'checklist') {
    const grouped = filtered.reduce((acc, item) => {
      if (!acc[item.week]) acc[item.week] = [];
      acc[item.week].push(item);
      return acc;
    }, {});
    const allTasks = filtered;
    const checkedCount = allTasks.filter(task => checked[task.id]).length;
    const progress = allTasks.length > 0 ? checkedCount / allTasks.length : 0;
    const done = allTasks.length > 0 && checkedCount === allTasks.length;
    const activeDoneColor = c.mode === 'dark' ? '#81C784' : '#2E7D32';

    return (
      <View style={styles.container}>
        <View style={{ margin: 16, marginBottom: 8 }}>
          {done ? (
            <Text style={[styles.progressLabel, { color: activeDoneColor }]}>{t('guide_all_done')}</Text>
          ) : (
            <Text style={styles.progressLabel}>{t('guide_progress', { checked: checkedCount, total: allTasks.length })}</Text>
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: done ? activeDoneColor : c.primary }]} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {Object.keys(grouped).sort((a, b) => a - b).map(week => (
            <View key={week} style={{ marginBottom: 18 }}>
              <Text style={styles.checklistWeekHeader}>{t('guide_week', { week })}</Text>
              {grouped[week].map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.checklistItem, { flexDirection: 'row', alignItems: 'flex-start' }]}
                  onPress={() => toggleChecked(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={checked[item.id] ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={checked[item.id] ? c.primary : c.textMuted}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checklistTask, checked[item.id] && { textDecorationLine: 'line-through', color: c.textMuted }]}>
                      {item.task}
                    </Text>
                    <Text style={styles.checklistDetails}>{item.details}</Text>
                    {item.office && (
                      <View style={styles.checklistMetaRow}>
                        <Ionicons name="location-outline" size={12} color={c.textMuted} />
                        <Text style={[styles.checklistOffice, { marginTop: 0 }]}>{item.office}</Text>
                      </View>
                    )}
                    {item.deadline && (
                      <View style={styles.checklistMetaRow}>
                        <Ionicons name="time-outline" size={12} color={c.warning} />
                        <Text style={[styles.checklistDeadline, { marginTop: 0 }]}>{item.deadline}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (category === 'offices') {
    return (
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.officeCard}
            onPress={() => setExpanded((s) => ({ ...s, [item.id]: !s[item.id] }))}
            activeOpacity={0.85}
          >
            <View style={styles.officeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.officeName}>{item.name}</Text>
                <Text style={styles.officeSubtitle}>{t('guide_office_location', { building: item.building, room: item.room })}</Text>
              </View>
              <Ionicons name={expanded[item.id] ? 'chevron-up' : 'chevron-down'} size={20} color={c.primary} />
            </View>
            {expanded[item.id] && (
              <View style={styles.officeExpanded}>
                <Text style={styles.officeHours}>🕐 {item.hours}</Text>
                {item.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`).catch(() => {})} style={styles.linkRow}>
                    <Ionicons name="call-outline" size={14} color={c.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.officeLinkText}>{item.phone}</Text>
                  </TouchableOpacity>
                )}
                {item.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`).catch(() => {})} style={styles.linkRow}>
                    <Ionicons name="mail-outline" size={14} color={c.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.officeLinkText}>{item.email}</Text>
                  </TouchableOpacity>
                )}
                {(item.tasks ?? []).length > 0 && (
                  <>
                    <Text style={styles.taskLabel}>{t('guide_services')}</Text>
                    {(item.tasks ?? []).map((task, i) => (
                      <Text key={i} style={styles.taskItem}>• {task}</Text>
                    ))}
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
        style={styles.container}
      />
    );
  }

  if (category === 'glossary') {
    return (
      <View style={styles.container}>
        <View style={styles.searchWrapper}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('guide_search_terms')} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <View style={styles.glossaryItem}>
              <Text style={styles.glossaryTerm}>{item.term}</Text>
              <Text style={styles.glossaryTranslation}>{item.translation}</Text>
              <Text style={styles.glossaryDef}>{item.definition}</Text>
            </View>
          )}
          style={styles.container}
        />
      </View>
    );
  }

  if (category === 'phrases') {
    const grouped = filtered.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});

    const copiedBadgeColor = c.mode === 'dark' ? '#81C784' : '#2E7D32';

    return (
      <ScrollView style={styles.container}>
        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat} style={{ padding: 16 }}>
            <Text style={styles.phraseCat}>{cat.toUpperCase()}</Text>
            {items.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.phraseCard, copiedId === p.id && styles.phraseCardCopied]}
                onPress={() => copyPhrase(p.id, p.german)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.phraseGerman}>{p.german}</Text>
                  <Text style={styles.phraseEnglish}>{p.english}</Text>
                  <Text style={styles.phrasePhonetic}>{p.phonetic}</Text>
                </View>
                <View style={styles.copyBadge}>
                  <Ionicons name={copiedId === p.id ? 'checkmark' : 'copy-outline'} size={16} color={copiedId === p.id ? copiedBadgeColor : c.textMuted} />
                  {copiedId === p.id && <Text style={styles.copiedText}>{t('guide_copied')}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        {Object.keys(grouped).length === 0 && <EmptyState />}
      </ScrollView>
    );
  }

  if (category === 'faq') {
    const faqCategories = Array.from(new Set(CATEGORIES.faq.map(f => f.category)));
    const categoryFiltered = selectedFaqCat === 'all' ? filtered : filtered.filter(f => f.category === selectedFaqCat);

    return (
      <View style={styles.container}>
        <View style={styles.searchWrapper}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('guide_search_faq')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faqTabRow} contentContainerStyle={{ alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.faqCatTab, selectedFaqCat === 'all' && styles.faqCatTabActive]}
            onPress={() => setSelectedFaqCat('all')}
          >
            <Text style={[styles.faqCatTabText, selectedFaqCat === 'all' && styles.faqCatTabTextActive]}>{t('common_all')}</Text>
          </TouchableOpacity>
          {faqCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.faqCatTab, selectedFaqCat === cat && styles.faqCatTabActive]}
              onPress={() => setSelectedFaqCat(cat)}
            >
              <Text style={[styles.faqCatTabText, selectedFaqCat === cat && styles.faqCatTabTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FlatList
          data={categoryFiltered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.faqCard}
              onPress={() => setExpanded((s) => ({ ...s, [item.id]: !s[item.id] }))}
              activeOpacity={0.85}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion} numberOfLines={expanded[item.id] ? undefined : 1}>
                  {item.question}
                </Text>
                <Ionicons name={expanded[item.id] ? 'chevron-up' : 'chevron-down'} size={20} color={c.primary} />
              </View>
              {expanded[item.id] && <Text style={styles.faqAnswer}>{item.answer}</Text>}
            </TouchableOpacity>
          )}
          style={styles.container}
        />
      </View>
    );
  }

  // buildings (default)
  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('guide_search_buildings')} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id ?? i.number)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.buildingCard}>
            <Text style={styles.buildingNum}>{t('guide_building_num', { number: item.number })}</Text>
            <Text style={styles.buildingName}>{item.name}</Text>
            <Text style={styles.buildingDesc}>{item.description}</Text>
            {item.services && item.services.length > 0 && (
              <View>
                <Text style={styles.servicesLabel}>{t('guide_services')}</Text>
                {item.services.map((s, i) => (
                  <Text key={i} style={styles.service}>• {s}</Text>
                ))}
              </View>
            )}
          </View>
        )}
        style={styles.container}
      />
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  searchWrapper: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  emergencyCard: { backgroundColor: c.surface, padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: c.error },
  emergencyName: { fontSize: 16, fontWeight: '700', color: c.error },
  emergencyDesc: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
  emergencyPhone: { fontSize: 13, color: c.primary, textDecorationLine: 'underline' },
  emergencyEmail: { fontSize: 13, color: c.primary, textDecorationLine: 'underline' },
  progressLabel: { fontWeight: '700', fontSize: 15, marginBottom: 8, color: c.text },
  progressTrack: { height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  checklistWeekHeader: { fontSize: 13, fontWeight: '700', color: c.primary, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  checklistDeadline: { fontSize: 12, color: c.warning, marginTop: 4 },
  contactCard: { backgroundColor: c.surface, padding: 14, borderRadius: 10, marginBottom: 10 },
  contactName: { fontSize: 16, fontWeight: '700', color: c.primary },
  contactRole: { fontSize: 14, color: c.text, marginTop: 2 },
  contactOrg: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  contactOffice: { fontSize: 12, color: c.textMuted, marginTop: 4 },
  contactEmail: { fontSize: 13, color: c.primary, textDecorationLine: 'underline' },
  checklistItem: { backgroundColor: c.surface, padding: 14, borderRadius: 10, marginBottom: 10 },
  checklistTask: { fontSize: 15, fontWeight: '700', color: c.text, marginTop: 2 },
  checklistDetails: { fontSize: 13, color: c.textSecondary, marginTop: 6, lineHeight: 20 },
  checklistOffice: { fontSize: 12, color: c.textMuted, marginTop: 6 },
  checklistMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  officeCard: { backgroundColor: c.surface, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  officeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  officeName: { fontSize: 15, fontWeight: '700', color: c.text },
  officeSubtitle: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  officeExpanded: { backgroundColor: c.surfaceAlt, borderTopWidth: 1, borderTopColor: c.border, padding: 14 },
  officeHours: { fontSize: 12, color: c.textSecondary, marginBottom: 6 },
  officeLinkText: { fontSize: 13, color: c.primary, textDecorationLine: 'underline' },
  taskLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  taskItem: { fontSize: 12, color: c.textSecondary, marginTop: 3 },
  glossaryItem: { backgroundColor: c.surface, padding: 14, borderRadius: 10, marginBottom: 10 },
  glossaryTerm: { fontSize: 16, fontWeight: '700', color: c.primary },
  glossaryTranslation: { fontSize: 14, fontWeight: '600', color: c.text, marginTop: 4 },
  glossaryDef: { fontSize: 13, color: c.textSecondary, marginTop: 6, lineHeight: 20 },
  phraseCat: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginBottom: 8, letterSpacing: 0.6 },
  phraseCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, padding: 12, borderRadius: 10, marginBottom: 8 },
  phraseCardCopied: { backgroundColor: c.mode === 'dark' ? '#1B5E2030' : '#E8F5E9', borderWidth: 1, borderColor: c.mode === 'dark' ? '#2E7D3260' : '#A5D6A7' },
  copyBadge: { alignItems: 'center', minWidth: 44 },
  copiedText: { fontSize: 10, color: c.mode === 'dark' ? '#81C784' : '#2E7D32', marginTop: 2, fontWeight: '600' },
  phraseGerman: { fontSize: 14, fontWeight: '700', color: c.primary },
  phraseEnglish: { fontSize: 13, color: c.text, marginTop: 2 },
  phrasePhonetic: { fontSize: 11, color: c.textMuted, marginTop: 2, fontStyle: 'italic' },
  faqTabRow: { paddingHorizontal: 12, marginBottom: 4, flexGrow: 0 },
  faqCatTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surfaceSunken, marginRight: 8, marginTop: 8 },
  faqCatTabActive: { backgroundColor: c.primary },
  faqCatTabText: { color: c.textMuted, fontWeight: '600', fontSize: 13 },
  faqCatTabTextActive: { color: c.onPrimary },
  faqCard: { backgroundColor: c.surface, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1 },
  faqAnswer: { backgroundColor: c.surfaceAlt, padding: 14, borderTopWidth: 1, borderTopColor: c.border, fontSize: 13, color: c.textSecondary, lineHeight: 20 },
  buildingCard: { backgroundColor: c.surface, padding: 14, borderRadius: 10, marginBottom: 10 },
  buildingNum: { fontSize: 11, color: c.primary, fontWeight: '700', textTransform: 'uppercase' },
  buildingName: { fontSize: 15, fontWeight: '700', color: c.text, marginTop: 4 },
  buildingDesc: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
  servicesLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, marginTop: 8, textTransform: 'uppercase' },
  service: { fontSize: 12, color: c.textSecondary, marginTop: 3 },
});
