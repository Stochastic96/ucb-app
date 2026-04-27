import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import guideBuildings from '../../data/guide_buildings.json';
import guideChecklist from '../../data/guide_checklist.json';
import guideOffices from '../../data/guide_offices.json';
import guideGlossary from '../../data/guide_glossary.json';
import guidePhrases from '../../data/guide_phrases.json';
import guideFaq from '../../data/guide_faq.json';
import { PRIMARY, INACTIVE, BG, SURFACE, BORDER } from '../../constants/colors';

const CATEGORIES = { buildings: guideBuildings, checklist: guideChecklist, offices: guideOffices, glossary: guideGlossary, phrases: guidePhrases, faq: guideFaq };

export default function GuideDetailScreen({ route }) {
  const { category } = route.params ?? {};
  const data = CATEGORIES[category] ?? [];
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((item) => {
      const text = JSON.stringify(item).toLowerCase();
      return text.includes(q);
    });
  }, [data, search]);

  if (category === 'checklist') {
    return (
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.checklistItem}>
            <Text style={styles.checklistWeek}>Week {item.week}</Text>
            <Text style={styles.checklistTask}>{item.task}</Text>
            <Text style={styles.checklistDetails}>{item.details}</Text>
            {item.office && <Text style={styles.checklistOffice}>📍 {item.office}</Text>}
          </View>
        )}
        style={{ backgroundColor: SURFACE }}
      />
    );
  }

  if (category === 'offices') {
    return (
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.officeCard}
            onPress={() => setExpanded((s) => ({ ...s, [item.id]: !s[item.id] }))}
          >
            <View style={styles.officeHeader}>
              <View>
                <Text style={styles.officeName}>{item.name}</Text>
                <Text style={styles.officeSubtitle}>Building {item.building}, Room {item.room}</Text>
              </View>
              <Ionicons name={expanded[item.id] ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY} />
            </View>
            {expanded[item.id] && (
              <View style={styles.officeExpanded}>
                <Text style={styles.officeHours}>🕐 {item.hours}</Text>
                {item.phone && <Text style={styles.officeContact}>📞 {item.phone}</Text>}
                {item.email && <Text style={styles.officeContact}>📧 {item.email}</Text>}
                <Text style={styles.taskLabel}>Services:</Text>
                {item.tasks.map((t, i) => (
                  <Text key={i} style={styles.taskItem}>• {t}</Text>
                ))}
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
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
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
                style={styles.phraseCard}
                onPress={() => {
                  Clipboard.setString(p.german);
                }}
              >
                <View>
                  <Text style={styles.phraseGerman}>{p.german}</Text>
                  <Text style={styles.phraseEnglish}>{p.english}</Text>
                  <Text style={styles.phrasePhonetic}>{p.phonetic}</Text>
                </View>
                <Ionicons name="copy-outline" size={18} color={INACTIVE} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  if (category === 'faq') {
    return (
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.faqCard}
            onPress={() => setExpanded((s) => ({ ...s, [item.id]: !s[item.id] }))}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion} numberOfLines={expanded[item.id] ? 999 : 1}>
                {item.question}
              </Text>
              <Ionicons name={expanded[item.id] ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY} />
            </View>
            {expanded[item.id] && <Text style={styles.faqAnswer}>{item.answer}</Text>}
          </TouchableOpacity>
        )}
        style={{ backgroundColor: SURFACE }}
      />
    );
  }

  // buildings
  return (
    <FlatList
      data={filtered}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      renderItem={({ item }) => (
        <View style={styles.buildingCard}>
          <Text style={styles.buildingNum}>Building {item.number}</Text>
          <Text style={styles.buildingName}>{item.name}</Text>
          <Text style={styles.buildingDesc}>{item.location}</Text>
          {item.services && item.services.length > 0 && (
            <View>
              <Text style={styles.servicesLabel}>Inside:</Text>
              {item.services.map((s, i) => (
                <Text key={i} style={styles.service}>• {s}</Text>
              ))}
            </View>
          )}
        </View>
      )}
      style={{ backgroundColor: SURFACE }}
    />
  );
}

const styles = StyleSheet.create({
  searchBar: { backgroundColor: BG, margin: 12, padding: 12, borderRadius: 10, fontSize: 14, borderWidth: 1, borderColor: BORDER },
  checklistItem: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10 },
  checklistWeek: { fontSize: 11, color: PRIMARY, fontWeight: '700', textTransform: 'uppercase' },
  checklistTask: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  checklistDetails: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 20 },
  checklistOffice: { fontSize: 12, color: INACTIVE, marginTop: 6 },
  officeCard: { backgroundColor: BG, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  officeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  officeName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  officeSubtitle: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  officeExpanded: { backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  officeHours: { fontSize: 12, color: '#555', marginBottom: 4 },
  officeContact: { fontSize: 12, color: INACTIVE, marginBottom: 2 },
  taskLabel: { fontSize: 11, fontWeight: '700', color: INACTIVE, marginTop: 8, textTransform: 'uppercase' },
  taskItem: { fontSize: 12, color: '#555', marginTop: 3 },
  glossaryItem: { backgroundColor: BG, padding: 14, borderRadius: 10, marginBottom: 10 },
  glossaryTerm: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  glossaryTranslation: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginTop: 4 },
  glossaryDef: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 20 },
  phraseCat: { fontSize: 12, fontWeight: '700', color: INACTIVE, marginBottom: 8, letterSpacing: 0.6 },
  phraseCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, padding: 12, borderRadius: 10, marginBottom: 8 },
  phraseGerman: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  phraseEnglish: { fontSize: 13, color: '#1A1A1A', marginTop: 2 },
  phrasePhonetic: { fontSize: 11, color: INACTIVE, marginTop: 2, fontStyle: 'italic' },
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
