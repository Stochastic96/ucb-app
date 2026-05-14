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
import menuData from '../../data/mensa_week.json';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT, BORDER } from '../../constants/colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri' };
const CATEGORIES = ['main', 'soup', 'side', 'dessert'];
const CATEGORY_LABELS = { main: 'Main Dish', soup: 'Soup', side: 'Side / Salad', dessert: 'Dessert' };
const CATEGORY_ICONS = { main: 'restaurant', soup: 'flame-outline', side: 'leaf-outline', dessert: 'ice-cream-outline' };

const TAG_STYLES = {
  vegan:       { bg: '#E8F5E9', color: '#2E7D32', label: 'Vegan' },
  vegetarian:  { bg: '#F3E5F5', color: '#6A1B9A', label: 'Vegetarian' },
  meat:        { bg: '#FBE9E7', color: '#BF360C', label: 'Meat' },
  fish:        { bg: '#E3F2FD', color: '#0D47A1', label: 'Fish' },
  glutenfree:  { bg: '#FFF8E1', color: '#F57F17', label: 'Gluten-free' },
};

function getTodayKey() {
  const d = new Date().getDay(); // 0=Sun,1=Mon,...
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d];
}

export default function MensaScreen() {
  const todayKey = getTodayKey();
  const defaultDay = DAYS.includes(todayKey) ? todayKey : 'Mon';
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [filter, setFilter] = useState('all'); // 'all' | 'vegan' | 'vegetarian'

  const dayData = menuData.days[selectedDay];

  const filtered = useMemo(() => {
    if (!dayData) return [];
    if (filter === 'all') return dayData.dishes;
    return dayData.dishes.filter((d) => d.tags?.includes(filter));
  }, [dayData, filter]);

  const grouped = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach((cat) => {
      const items = filtered.filter((d) => d.category === cat);
      if (items.length) groups[cat] = items;
    });
    return groups;
  }, [filtered]);

  const isVeganDay = selectedDay === 'Mon';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Week info */}
      <View style={styles.weekBanner}>
        <Ionicons name="calendar-outline" size={15} color={INACTIVE} />
        <Text style={styles.weekText}>Week of {menuData.days['Mon']?.date?.split('-').slice(1).join('.')}</Text>
        <Text style={styles.weekNote}>Menu updated weekly</Text>
      </View>

      {/* Day selector */}
      <View style={styles.dayRow}>
        {DAYS.map((day) => {
          const isToday = day === todayKey;
          const active = day === selectedDay;
          const isVegan = day === 'Mon';
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayBtn, active && styles.dayBtnActive]}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.75}
              accessibilityLabel={DAY_LABELS[day]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                {DAY_LABELS[day]}
              </Text>
              {isVegan && <Text style={styles.veganDot}>🌱</Text>}
              {isToday && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vegan Monday banner */}
      {isVeganDay && (
        <View style={styles.veganBanner}>
          <Text style={styles.veganBannerEmoji}>🌱</Text>
          <View>
            <Text style={styles.veganBannerTitle}>Vegan Monday</Text>
            <Text style={styles.veganBannerSub}>100% plant-based menu every Monday — a UCB tradition</Text>
          </View>
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {['all', 'vegan', 'vegetarian'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            accessibilityLabel={`Filter: ${f === 'all' ? 'All dishes' : f === 'vegan' ? 'Vegan only' : 'Vegetarian only'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All' : f === 'vegan' ? '🌱 Vegan' : '🥗 Vegetarian'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" size={40} color={BORDER} />
          <Text style={styles.emptyText}>No dishes match your filter today</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([cat, dishes]) => (
          <View key={cat} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={CATEGORY_ICONS[cat]} size={15} color={DARK} />
              <Text style={styles.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
            </View>
            {dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </View>
        ))
      )}

      {/* Contact */}
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => Linking.openURL('mailto:service@campus-company.eu').catch(() => {})}
        accessibilityLabel="Email Mensa: service@campus-company.eu"
        accessibilityRole="button"
      >
        <Ionicons name="mail-outline" size={18} color={PRIMARY} />
        <View style={{ flex: 1 }}>
          <Text style={styles.contactTitle}>Culinaria Campus Restaurant</Text>
          <Text style={styles.contactSub}>Feedback or allergies? Contact the kitchen.</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={INACTIVE} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function DishCard({ dish }) {
  return (
    <View style={styles.dishCard}>
      <View style={styles.dishTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dishName}>{dish.name}</Text>
          {dish.nameEn && <Text style={styles.dishNameEn}>{dish.nameEn}</Text>}
        </View>
        <View style={styles.tagRow}>
          {(dish.tags || []).map((tag) => {
            const s = TAG_STYLES[tag];
            if (!s) return null;
            return (
              <View key={tag} style={[styles.tag, { backgroundColor: s.bg }]}>
                <Text style={[styles.tagText, { color: s.color }]}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.priceRow}>
        <PriceChip label="Student" value={`€${dish.prices.student}`} />
        <PriceChip label="Staff" value={`€${dish.prices.employee}`} />
        <PriceChip label="Guest" value={`€${dish.prices.guest}`} />
      </View>
    </View>
  );
}

function PriceChip({ label, value }) {
  return (
    <View style={styles.priceChip}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 40 },
  weekBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  weekText: { fontSize: 13, color: INACTIVE },
  weekNote: { fontSize: 12, color: INACTIVE, marginLeft: 'auto' },
  dayRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: BG,
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SURFACE,
    position: 'relative',
  },
  dayBtnActive: { backgroundColor: PRIMARY },
  dayLabel: { fontSize: 13, fontWeight: '600', color: INACTIVE },
  dayLabelActive: { color: '#fff' },
  veganDot: { fontSize: 10, marginTop: 2 },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DARK,
  },
  veganBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 12,
    padding: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  veganBannerEmoji: { fontSize: 28 },
  veganBannerTitle: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  veganBannerSub: { fontSize: 12, color: '#388E3C', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 13, color: INACTIVE, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { color: INACTIVE, fontSize: 14 },
  section: { marginHorizontal: 12, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingLeft: 4,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6 },
  dishCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dishTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dishName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', lineHeight: 20 },
  dishNameEn: { fontSize: 12, color: INACTIVE, marginTop: 2, fontStyle: 'italic' },
  tagRow: { flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '700' },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceChip: { flex: 1, backgroundColor: SURFACE, borderRadius: 8, padding: 8, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.3 },
  priceValue: { fontSize: 14, fontWeight: '700', color: DARK, marginTop: 2 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 12,
    padding: 14,
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  contactTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  contactSub: { fontSize: 12, color: INACTIVE, marginTop: 2 },
});
