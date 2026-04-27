import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG } from '../../constants/colors';

const CATEGORIES = [
  { id: 'buildings', icon: 'home-outline', label: 'Campus Buildings', count: 4 },
  { id: 'checklist', icon: 'checkbox-outline', label: 'First Week Checklist', count: 9 },
  { id: 'offices', icon: 'business-outline', label: 'Office Directory', count: 7 },
  { id: 'glossary', icon: 'book-outline', label: 'German Glossary', count: 22 },
  { id: 'phrases', icon: 'chatbubble-outline', label: 'German Phrases', count: 22 },
  { id: 'faq', icon: 'help-circle-outline', label: 'FAQ', count: 15 },
];

export default function GuideScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <FlatList
        data={CATEGORIES}
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
