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

export default function GuideScreen({ navigation }) {
  const categories = [
    { id: 'emergency', icon: 'alert-circle-outline', label: 'Emergency Info', count: emergency.length },
    { id: 'buildings', icon: 'home-outline', label: 'Campus Buildings', count: buildings.length },
    { id: 'checklist', icon: 'checkbox-outline', label: 'First Week Checklist', count: checklist.length },
    { id: 'offices', icon: 'business-outline', label: 'Office Directory', count: offices.length },
    { id: 'contacts', icon: 'person-outline', label: 'Contacts', count: contacts.length },
    { id: 'glossary', icon: 'book-outline', label: 'German Glossary', count: glossary.length },
    { id: 'phrases', icon: 'chatbubble-outline', label: 'German Phrases', count: phrases.length },
    { id: 'faq', icon: 'help-circle-outline', label: 'FAQ', count: faq.length },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
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
            <View style={[styles.iconBox, { backgroundColor: PRIMARY + '15' }]}>
              <Ionicons name={item.icon} size={28} color={PRIMARY} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.count}>{item.count} items</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={INACTIVE} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
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
  iconBox: { width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  count: { fontSize: 12, color: INACTIVE, marginTop: 2 },
});
