import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG, SURFACE, ACCENT, BORDER } from '../../constants/colors';

const CARDS = [
  { key: 'MensaAdmin',     icon: 'restaurant-outline',      label: 'Speiseplan',       desc: 'Gerichte & Wochenplan' },
  { key: 'EventsAdmin',    icon: 'calendar-outline',        label: 'Veranstaltungen',  desc: 'Campus-Events bearbeiten' },
  { key: 'SportsAdmin',    icon: 'basketball-outline',      label: 'Sportplan',        desc: 'Zeiten & Übungsleiter' },
  { key: 'GuideAdmin',     icon: 'book-outline',            label: 'Guide-Inhalte',    desc: '14 Inhaltsbereiche' },
  { key: 'ResourcesAdmin', icon: 'grid-outline',            label: 'Campus-Angebote',  desc: 'Ressourcen & Dienste' },
  { key: 'CalendarAdmin',  icon: 'calendar-number-outline', label: 'Semesterkalender', desc: 'Termine & Semesterinfo' },
];

export default function AdminDashboardScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.adminBadgeText}>Admin-Modus</Text>
          </View>
          <Text style={styles.headerTitle}>Inhalte verwalten</Text>
          <Text style={styles.headerSub}>Änderungen sind sofort für alle Nutzer sichtbar.</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={18} color={PRIMARY} />
          <Text style={styles.backBtnText}>App</Text>
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <View style={styles.grid}>
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={styles.card}
            onPress={() => navigation.navigate(card.key)}
            activeOpacity={0.75}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={card.icon} size={28} color={PRIMARY} />
            </View>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={14} color={INACTIVE} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>
        Tippe auf einen Bereich, um Inhalte zu bearbeiten.{'\n'}
        Mit ← zurück wechselst du zur normalen App-Ansicht.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: BG, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  headerLeft: { flex: 1 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
  adminBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  headerSub: { fontSize: 12, color: INACTIVE },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  backBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  card: { width: '47%', backgroundColor: BG, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: INACTIVE, marginBottom: 8 },
  cardArrow: { alignItems: 'flex-end' },
  hint: { fontSize: 12, color: INACTIVE, textAlign: 'center', lineHeight: 18, marginTop: 8 },
});
