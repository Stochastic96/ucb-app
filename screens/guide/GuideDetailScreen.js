import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
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
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER } from '../../constants/colors';
import { getAllBuildings } from '../../services/buildings';
import InfoSectionView from './InfoSectionView';
import guideWork from '../../data/guide_work.json';
import guideHealth from '../../data/guide_health.json';
import guideAccommodation from '../../data/guide_accommodation.json';
import guideBureaucracy from '../../data/guide_bureaucracy.json';
import guideLanguage from '../../data/guide_language.json';
import guideRights from '../../data/guide_rights.json';

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

function EmptyState({ message = 'No results found.' }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={36} color={INACTIVE} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function GuideDetailScreen({ route }) {
  const { category } = route.params ?? {};
  const data = CATEGORIES[category] ?? [];
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  // Checklist state — hoisted here to obey Rules of Hooks
  const [checked, setChecked] = useState({});
  // FAQ category filter — hoisted here to obey Rules of Hooks
  const [selectedFaqCat, setSelectedFaqCat] = useState('all');
  // Phrase copy feedback: stores the id of the last copied phrase briefly
  const [copiedId, setCopiedId] = useState(null);

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
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)} style={styles.linkRow}>
                <Ionicons name="call-outline" size={16} color={PRIMARY} style={{ marginRight: 4 }} />
                <Text style={styles.emergencyPhone}>{item.phone}</Text>
              </TouchableOpacity>
            )}
            {item.email && (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`)} style={styles.linkRow}>
                <Ionicons name="mail-outline" size={16} color={PRIMARY} style={{ marginRight: 4 }} />
                <Text style={styles.emergencyEmail}>{item.email}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        style={{ backgroundColor: SURFACE }}
      />
    );
  }

  if (category === 'contacts') {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search contacts..."
          placeholderTextColor={INACTIVE}
          value={search}
          onChangeText={setSearch}
        />
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
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)} style={styles.linkRow}>
                  <Ionicons name="call-outline" size={16} color={PRIMARY} style={{ marginRight: 4 }} />
                  <Text style={styles.contactEmail}>{item.phone}</Text>
                </TouchableOpacity>
              )}
              {item.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`)} style={styles.linkRow}>
                  <Ionicons name="mail-outline" size={16} color={PRIMARY} style={{ marginRight: 4 }} />
                  <Text style={styles.contactEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          style={{ backgroundColor: SURFACE }}
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
    const checkedCount = allTasks.filter(t => checked[t.id]).length;
    const progress = allTasks.length > 0 ? checkedCount / allTasks.length : 0;
    const done = allTasks.length > 0 && checkedCount === allTasks.length;

    return (
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <View style={{ margin: 16, marginBottom: 8 }}>
          {done ? (
            <Text style={[styles.progressLabel, { color: '#2E7D32' }]}>All done! Great work 🎉</Text>
          ) : (
            <Text style={styles.progressLabel}>Progress: {checkedCount} / {allTasks.length}</Text>
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: done ? '#2E7D32' : PRIMARY }]} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {Object.keys(grouped).sort((a, b) => a - b).map(week => (
            <View key={week} style={{ marginBottom: 18 }}>
              <Text style={styles.checklistWeekHeader}>Week {week}</Text>
              {grouped[week].map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.checklistItem, { flexDirection: 'row', alignItems: 'flex-start' }]}
                  onPress={() => setChecked(s => ({ ...s, [item.id]: !s[item.id] }))}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={checked[item.id] ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={checked[item.id] ? PRIMARY : INACTIVE}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checklistTask, checked[item.id] && { textDecorationLine: 'line-through', color: INACTIVE }]}>
                      {item.task}
                    </Text>
                    <Text style={styles.checklistDetails}>{item.details}</Text>
                    {item.office && <Text style={styles.checklistOffice}>📍 {item.office}</Text>}
                    {item.deadline && <Text style={styles.checklistDeadline}>⏰ {item.deadline}</Text>}
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
                <Text style={styles.officeSubtitle}>Building {item.building}, Room {item.room}</Text>
              </View>
              <Ionicons name={expanded[item.id] ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY} />
            </View>
            {expanded[item.id] && (
              <View style={styles.officeExpanded}>
                <Text style={styles.officeHours}>🕐 {item.hours}</Text>
                {item.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)} style={styles.linkRow}>
                    <Ionicons name="call-outline" size={14} color={PRIMARY} style={{ marginRight: 4 }} />
                    <Text style={styles.officeLinkText}>{item.phone}</Text>
                  </TouchableOpacity>
                )}
                {item.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`)} style={styles.linkRow}>
                    <Ionicons name="mail-outline" size={14} color={PRIMARY} style={{ marginRight: 4 }} />
                    <Text style={styles.officeLinkText}>{item.email}</Text>
                  </TouchableOpacity>
                )}
                {(item.tasks ?? []).length > 0 && (
                  <>
                    <Text style={styles.taskLabel}>Services:</Text>
                    {(item.tasks ?? []).map((t, i) => (
                      <Text key={i} style={styles.taskItem}>• {t}</Text>
                    ))}
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
        style={{ backgroundColor: SURFACE }}
      />
    );
  }

  if (category === 'glossary') {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search terms..."
          placeholderTextColor={INACTIVE}
          value={search}
          onChangeText={setSearch}
        />
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

    return (
      <ScrollView style={{ backgroundColor: SURFACE }}>
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
                  <Ionicons name={copiedId === p.id ? 'checkmark' : 'copy-outline'} size={16} color={copiedId === p.id ? '#2E7D32' : INACTIVE} />
                  {copiedId === p.id && <Text style={styles.copiedText}>Copied</Text>}
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
      <View style={{ flex: 1, backgroundColor: SURFACE }}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search FAQ..."
          placeholderTextColor={INACTIVE}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faqTabRow} contentContainerStyle={{ alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.faqCatTab, selectedFaqCat === 'all' && styles.faqCatTabActive]}
            onPress={() => setSelectedFaqCat('all')}
          >
            <Text style={[styles.faqCatTabText, selectedFaqCat === 'all' && styles.faqCatTabTextActive]}>All</Text>
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
                <Ionicons name={expanded[item.id] ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY} />
              </View>
              {expanded[item.id] && <Text style={styles.faqAnswer}>{item.answer}</Text>}
            </TouchableOpacity>
          )}
          style={{ backgroundColor: SURFACE }}
        />
      </View>
    );
  }

  // buildings (default)
  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search buildings..."
        placeholderTextColor={INACTIVE}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id ?? i.number)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.buildingCard}>
            <Text style={styles.buildingNum}>Building {item.number}</Text>
            <Text style={styles.buildingName}>{item.name}</Text>
            <Text style={styles.buildingDesc}>{item.description}</Text>
            {item.services && item.services.length > 0 && (
              <View>
                <Text style={styles.servicesLabel}>Services:</Text>
                {item.services.map((s, i) => (
                  <Text key={i} style={styles.service}>• {s}</Text>
                ))}
              </View>
            )}
          </View>
        )}
        style={{ backgroundColor: SURFACE }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { fontSize: 14, color: INACTIVE, marginTop: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  emergencyCard: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#D32F2F' },
  emergencyName: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },
  emergencyDesc: { fontSize: 13, color: '#555', marginTop: 4 },
  emergencyPhone: { fontSize: 13, color: PRIMARY, textDecorationLine: 'underline' },
  emergencyEmail: { fontSize: 13, color: PRIMARY, textDecorationLine: 'underline' },
  progressLabel: { fontWeight: '700', fontSize: 15, marginBottom: 8, color: '#1A1A1A' },
  progressTrack: { height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  checklistWeekHeader: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  checklistDeadline: { fontSize: 12, color: '#F57C00', marginTop: 4 },
  contactCard: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10 },
  contactName: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  contactRole: { fontSize: 14, color: '#1A1A1A', marginTop: 2 },
  contactOrg: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  contactOffice: { fontSize: 12, color: INACTIVE, marginTop: 4 },
  contactEmail: { fontSize: 13, color: PRIMARY, textDecorationLine: 'underline' },
  searchBar: { backgroundColor: BG, margin: 12, marginBottom: 4, padding: 12, borderRadius: 10, fontSize: 14, borderWidth: 1, borderColor: BORDER },
  checklistItem: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10 },
  checklistTask: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  checklistDetails: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 20 },
  checklistOffice: { fontSize: 12, color: INACTIVE, marginTop: 6 },
  officeCard: { backgroundColor: BG, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  officeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  officeName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  officeSubtitle: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  officeExpanded: { backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  officeHours: { fontSize: 12, color: '#555', marginBottom: 6 },
  officeLinkText: { fontSize: 13, color: PRIMARY, textDecorationLine: 'underline' },
  taskLabel: { fontSize: 11, fontWeight: '700', color: INACTIVE, marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  taskItem: { fontSize: 12, color: '#555', marginTop: 3 },
  glossaryItem: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10 },
  glossaryTerm: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  glossaryTranslation: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },
  glossaryDef: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 20 },
  phraseCat: { fontSize: 12, fontWeight: '700', color: INACTIVE, marginBottom: 8, letterSpacing: 0.6 },
  phraseCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, padding: 12, borderRadius: 10, marginBottom: 8 },
  phraseCardCopied: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  copyBadge: { alignItems: 'center', minWidth: 44 },
  copiedText: { fontSize: 10, color: '#2E7D32', marginTop: 2, fontWeight: '600' },
  phraseGerman: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  phraseEnglish: { fontSize: 13, color: '#1A1A1A', marginTop: 2 },
  phrasePhonetic: { fontSize: 11, color: INACTIVE, marginTop: 2, fontStyle: 'italic' },
  faqTabRow: { paddingHorizontal: 12, marginBottom: 4, flexGrow: 0 },
  faqCatTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: BORDER, marginRight: 8, marginTop: 8 },
  faqCatTabActive: { backgroundColor: PRIMARY },
  faqCatTabText: { color: INACTIVE, fontWeight: '600', fontSize: 13 },
  faqCatTabTextActive: { color: '#fff' },
  faqCard: { backgroundColor: BG, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  faqAnswer: { backgroundColor: SURFACE, padding: 14, borderTopWidth: 1, borderTopColor: BORDER, fontSize: 13, color: '#555', lineHeight: 20 },
  buildingCard: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10 },
  buildingNum: { fontSize: 11, color: PRIMARY, fontWeight: '700', textTransform: 'uppercase' },
  buildingName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  buildingDesc: { fontSize: 13, color: '#555', marginTop: 4 },
  servicesLabel: { fontSize: 11, fontWeight: '700', color: INACTIVE, marginTop: 8, textTransform: 'uppercase' },
  service: { fontSize: 12, color: '#555', marginTop: 3 },
});
