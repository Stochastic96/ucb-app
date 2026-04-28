import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG } from '../../constants/colors';
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
};

export default function GuideScreen({ navigation }) {
  const categories = [
    { id: 'emergency', icon: 'alert-circle-outline', label: 'Emergency Info', count: emergency.length, desc: 'Ambulance, police, fire & campus security' },
    { id: 'buildings', icon: 'home-outline', label: 'Campus Buildings', count: buildings.length, desc: 'Locations, rooms & services' },
    { id: 'checklist', icon: 'checkbox-outline', label: 'First Week Checklist', count: checklist.length, desc: 'Everything to do when you arrive' },
    { id: 'offices', icon: 'business-outline', label: 'Office Directory', count: offices.length, desc: 'Opening hours & contacts' },
    { id: 'contacts', icon: 'person-outline', label: 'Contacts', count: contacts.length, desc: 'Key people & departments' },
    { id: 'glossary', icon: 'book-outline', label: 'German Glossary', count: glossary.length, desc: 'University terms explained' },
    { id: 'phrases', icon: 'chatbubble-outline', label: 'German Phrases', count: phrases.length, desc: 'Tap any phrase to copy it' },
    { id: 'faq', icon: 'help-circle-outline', label: 'FAQ', count: faq.length, desc: 'Common questions answered' },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListHeaderComponent={<DisclaimerBanner />}
        renderItem={({ item }) => {
          const color = CATEGORY_COLORS[item.id] ?? PRIMARY;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.push('GuideDetail', {
                  category: item.id,
                  title: item.label,
                })
              }
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={item.icon} size={26} color={color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.count}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={INACTIVE} style={{ marginLeft: 4 }} />
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  iconBox: { width: 46, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  desc: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  countBadge: { backgroundColor: '#F0F0F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  countText: { fontSize: 12, fontWeight: '600', color: INACTIVE },
});
