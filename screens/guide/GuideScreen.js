import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../../components/SearchBar';
import { PRIMARY, INACTIVE, BG, BORDER, SURFACE } from '../../constants/colors';
import buildings from '../../data/buildings.json';
import checklist from '../../data/guide_checklist.json';
import offices from '../../data/guide_offices.json';
import glossary from '../../data/guide_glossary.json';
import phrases from '../../data/guide_phrases.json';
import faq from '../../data/guide_faq.json';
import contacts from '../../data/guide_contacts.json';
import emergency from '../../data/guide_emergency.json';
import { trackScreen, trackEvent } from '../../services/analytics';

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
  const [query, setQuery] = useState('');

  useEffect(() => { trackScreen('GuideScreen'); }, []);

  const categories = [
    { id: 'emergency', icon: 'alert-circle-outline', label: 'Emergency Info', count: emergency.length, desc: 'Ambulance, police, fire & campus security' },
    { id: 'buildings', icon: 'home-outline', label: 'Campus Buildings', count: buildings.length, desc: 'Locations, rooms & services' },
    { id: 'checklist', icon: 'checkbox-outline', label: 'First Week Checklist', count: checklist.length, desc: 'Everything to do when you arrive' },
    { id: 'offices', icon: 'business-outline', label: 'Office Directory', count: offices.length, desc: 'Opening hours & contacts' },
    { id: 'contacts', icon: 'person-outline', label: 'Contacts', count: contacts.length, desc: 'Professors & key departments' },
    { id: 'glossary', icon: 'book-outline', label: 'German Glossary', count: glossary.length, desc: 'University terms explained' },
    { id: 'phrases', icon: 'chatbubble-outline', label: 'German Phrases', count: phrases.length, desc: 'Tap any phrase to copy it' },
    { id: 'faq', icon: 'help-circle-outline', label: 'FAQ', count: faq.length, desc: 'Common questions answered' },
    { id: 'work', icon: 'briefcase-outline', label: 'Work & Finance', count: 6, desc: 'Working rights, Minijob, Werkstudent' },
    { id: 'health', icon: 'medical-outline', label: 'Health Insurance', count: 6, desc: 'GKV, enrollment steps, providers' },
    { id: 'accommodation', icon: 'bed-outline', label: 'Accommodation', count: 5, desc: 'Campus housing, Kaltmiete vs. Warmmiete' },
    { id: 'bureaucracy', icon: 'document-text-outline', label: 'Bureaucracy & Arrival', count: 7, desc: 'Anmeldung, residence permit, tax ID' },
    { id: 'language', icon: 'language-outline', label: 'Language Learning', count: 4, desc: 'Free & local German courses' },
    { id: 'rights', icon: 'shield-checkmark-outline', label: 'Student Rights', count: 4, desc: 'Counselling, exam review, AStA, hardship fund' },
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
              <Text style={styles.heroTitle}>Survival Guide</Text>
              <Text style={styles.heroSub}>Your field guide to life at Hochschule Trier</Text>
            </View>
            <View style={styles.searchWrapper}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Search topics…"
              />
            </View>
            {!query.trim() && <DisclaimerBanner />}
            <Text style={styles.sectionLabel}>Topics</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No topics match "{query}"</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = CATEGORY_COLORS[item.id] ?? PRIMARY;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                trackEvent('feature_use', 'guide_category_opened', { category: item.id });
                navigation.push('GuideDetail', { category: item.id, title: item.label });
              }}
              activeOpacity={0.75}
              accessibilityLabel={`${item.label}: ${item.desc}`}
              accessibilityRole="button"
            >
              <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                <Ionicons name={item.icon} size={24} color={color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.count}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={INACTIVE} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function DisclaimerBanner() {
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={18} color="#795548" style={{ marginRight: 6, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.disclaimerTitle}>Unofficial Student App</Text>
        <Text style={styles.disclaimerText}>
          This app is not affiliated with or endorsed by the university. All information is provided for guidance only and may be outdated. Always verify with official university sources. No liability is assumed for errors or omissions (Haftungsausschluss).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  listContent: { paddingBottom: 40 },
  hero: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 13, color: INACTIVE, marginTop: 3 },
  searchWrapper: { marginHorizontal: 12, marginBottom: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: INACTIVE, fontSize: 14 },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  disclaimerTitle: { fontSize: 12, fontWeight: '700', color: '#795548', marginBottom: 3 },
  disclaimerText: { fontSize: 11, color: '#795548', lineHeight: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: { width: 48, height: 48, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  desc: { fontSize: 13, color: INACTIVE, marginTop: 2 },
  countBadge: { backgroundColor: '#F0F0F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '600', color: INACTIVE },
});
