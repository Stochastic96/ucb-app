import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import resources from '../../data/campus_resources.json';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT, BORDER } from '../../constants/colors';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'mobility', label: '🚲 Mobility' },
  { id: 'food', label: '🍽 Food' },
  { id: 'sports', label: '⚽ Sports' },
  { id: 'study', label: '📚 Study' },
  { id: 'sustainability', label: '🌱 Green' },
  { id: 'community', label: '👥 Community' },
];

export default function CampusResourcesScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return resources;
    return resources.filter((r) => r.category === activeCategory);
  }, [activeCategory]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Campus Resources</Text>
        <Text style={styles.heroSub}>Everything UCB offers — most of it free</Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterChip, activeCategory === cat.id && styles.filterChipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[styles.filterChipText, activeCategory === cat.id && styles.filterChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resource cards */}
      {filtered.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          expanded={expanded === resource.id}
          onToggle={() => setExpanded(expanded === resource.id ? null : resource.id)}
        />
      ))}
    </ScrollView>
  );
}

function ResourceCard({ resource, expanded, onToggle }) {
  const hasContact = resource.contact || resource.phone || resource.instagram;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name={resource.icon} size={22} color={DARK} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{resource.title}</Text>
          {!expanded && (
            <Text style={styles.cardDesc} numberOfLines={2}>{resource.description}</Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={INACTIVE}
          style={{ marginLeft: 8, alignSelf: 'flex-start', marginTop: 2 }}
        />
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <Text style={styles.expandedDesc}>{resource.description}</Text>

          {resource.tip && (
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={14} color='#F57F17' />
              <Text style={styles.tipText}>{resource.tip}</Text>
            </View>
          )}

          <View style={styles.metaGrid}>
            {resource.location && (
              <MetaRow icon="location-outline" text={resource.location} />
            )}
            {resource.schedule && (
              <MetaRow icon="time-outline" text={resource.schedule} />
            )}
            {resource.phone && (
              <MetaRow
                icon="call-outline"
                text={resource.phone}
                onPress={() => Linking.openURL(`tel:${resource.phone}`).catch(() => {})}
              />
            )}
            {resource.contact && resource.contact.includes('@') && (
              <MetaRow
                icon="mail-outline"
                text={resource.contact}
                onPress={() => Linking.openURL(`mailto:${resource.contact}`).catch(() => {})}
              />
            )}
            {resource.instagram && (
              <MetaRow icon="logo-instagram" text={resource.instagram} />
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function MetaRow({ icon, text, onPress }) {
  const Inner = (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={DARK} />
      <Text style={[styles.metaText, onPress && styles.metaLink]}>{text}</Text>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{Inner}</TouchableOpacity>;
  return Inner;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 40 },
  hero: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 13, color: INACTIVE, marginTop: 3 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: '#DCDCDC',
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 13, color: INACTIVE, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  card: {
    backgroundColor: BG,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardDesc: { fontSize: 13, color: INACTIVE, marginTop: 3, lineHeight: 18 },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  expandedDesc: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12 },
  tipBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipText: { fontSize: 13, color: '#5D4037', flex: 1, lineHeight: 18 },
  metaGrid: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#444', flex: 1 },
  metaLink: { color: PRIMARY, textDecorationLine: 'underline' },
});
