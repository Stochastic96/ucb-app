import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../../components/SearchBar';
import resources from '../../data/campus_resources.json';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';

const CATEGORIES = [
  { id: 'all',            labelKey: 'common_all' },
  { id: 'mobility',       label: 'Mobility',  icon: 'bicycle-outline' },
  { id: 'food',           label: 'Food',      icon: 'restaurant-outline' },
  { id: 'sports',         label: 'Sports',    icon: 'football-outline' },
  { id: 'study',          label: 'Study',     icon: 'book-outline' },
  { id: 'sustainability', label: 'Green',     icon: 'leaf-outline' },
  { id: 'community',      label: 'Community', icon: 'people-outline' },
];

export default function CampusResourcesScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let result = activeCategory === 'all' ? resources : resources.filter((r) => r.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tip?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, query]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('resources_title')}</Text>
        <Text style={styles.heroSub}>{t('resources_subtitle')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('resources_search_placeholder')}
        />
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterChip, activeCategory === cat.id && styles.filterChipActive]}
            onPress={() => setActiveCategory(cat.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategory === cat.id }}
          >
            {cat.icon && (
              <Ionicons
                name={cat.icon}
                size={14}
                color={activeCategory === cat.id ? c.onPrimary : c.textMuted}
                style={styles.filterChipIcon}
              />
            )}
            <Text style={[styles.filterChipText, activeCategory === cat.id && styles.filterChipTextActive]}>
              {cat.labelKey ? t(cat.labelKey) : cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resource cards */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={36} color={c.border} />
          <Text style={styles.emptyText}>{t('resources_no_results')}</Text>
        </View>
      ) : (
        filtered.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            expanded={expanded === resource.id}
            onToggle={() => setExpanded(expanded === resource.id ? null : resource.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

function ResourceCard({ resource, expanded, onToggle }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name={resource.icon} size={22} color={c.brandIcon} />
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
          color={c.textMuted}
          style={{ marginLeft: 8, alignSelf: 'flex-start', marginTop: 2 }}
        />
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <Text style={styles.expandedDesc}>{resource.description}</Text>

          {resource.tip && (
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={14} color={c.onWarning} />
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
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const Inner = (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={c.brandIcon} />
      <Text style={[styles.metaText, onPress && styles.metaLink]}>{text}</Text>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{Inner}</TouchableOpacity>;
  return Inner;
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 40 },
  hero: {
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  heroTitle: { ...c.type.titleLg, color: c.text },
  heroSub: { ...c.type.bodySm, color: c.textMuted, marginTop: 3 },
  searchWrapper: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { ...c.type.bodySm, fontSize: 14, color: c.textMuted },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterChipIcon: { marginLeft: -2 },
  filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  filterChipText: { ...c.type.bodySm, fontFamily: c.fonts.bodyMedium, color: c.textMuted },
  filterChipTextActive: { color: c.onPrimary },
  card: {
    backgroundColor: c.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: c.radius.lg,
    padding: 14,
    ...c.shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { ...c.type.bodyStrong, fontFamily: c.fonts.bodyBold, color: c.text },
  cardDesc: { ...c.type.bodySm, color: c.textMuted, marginTop: 3 },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  expandedDesc: { ...c.type.bodySm, fontSize: 14, color: c.textSecondary, marginBottom: 12 },
  tipBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: c.warningSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipText: { ...c.type.bodySm, color: c.onWarning, flex: 1 },
  metaGrid: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { ...c.type.bodySm, color: c.textSecondary, flex: 1 },
  metaLink: { color: c.primary, textDecorationLine: 'underline' },
});
