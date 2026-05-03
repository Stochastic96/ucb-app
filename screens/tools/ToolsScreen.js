import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT, BORDER } from '../../constants/colors';

const TOOLS = [
  {
    id: 'timetable',
    label: 'Timetable',
    description: 'Your weekly class schedule',
    icon: 'calendar-outline',
    iconColor: '#2196F3',
    iconBg: '#E3F2FD',
    target: 'stack',
    screen: 'Timetable',
  },
  {
    id: 'events',
    label: 'Events & Sports',
    description: 'Campus events and sports schedule',
    icon: 'football-outline',
    iconColor: '#E91E63',
    iconBg: '#FCE4EC',
    target: 'root',
    screen: 'EventsList',
  },
  {
    id: 'courses',
    label: 'My Courses',
    description: 'Files, announcements and details',
    icon: 'albums-outline',
    iconColor: '#9C27B0',
    iconBg: '#F3E5F5',
    target: 'root',
    screen: 'CoursesList',
  },
  {
    id: 'news',
    label: 'News',
    description: 'University and course updates',
    icon: 'newspaper-outline',
    iconColor: '#FF9800',
    iconBg: '#FFF3E0',
    target: 'root',
    screen: 'NewsFeed',
  },
];

const COMING_SOON = [
  { id: 'mensa', label: 'Mensa Menu', description: 'Weekly lunch menu', icon: 'restaurant-outline' },
  { id: 'planner', label: 'Deadline Planner', description: 'Track submissions & presentations', icon: 'checkmark-circle-outline' },
  { id: 'exams', label: 'Exam Tracker', description: 'Registration reminders & exam planner', icon: 'school-outline' },
  { id: 'resources', label: 'Campus Resources', description: 'Bike rental, repair days & more', icon: 'bicycle-outline' },
];

export default function ToolsScreen({ navigation }) {
  const navigateTo = (tool) => {
    if (tool.target === 'stack') {
      navigation.navigate(tool.screen);
    } else if (tool.target === 'root') {
      navigation.getParent()?.getParent()?.navigate(tool.screen);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Student Tools</Text>
        <Text style={styles.heroSub}>Everything you need in one place</Text>
      </View>

      <Text style={styles.sectionLabel}>Available</Text>
      {TOOLS.map((tool, i) => (
        <TouchableOpacity
          key={tool.id}
          style={[styles.toolCard, i === TOOLS.length - 1 && styles.toolCardLast]}
          onPress={() => navigateTo(tool)}
          activeOpacity={0.75}
        >
          <View style={[styles.toolIcon, { backgroundColor: tool.iconBg }]}>
            <Ionicons name={tool.icon} size={24} color={tool.iconColor} />
          </View>
          <View style={styles.toolText}>
            <Text style={styles.toolLabel}>{tool.label}</Text>
            <Text style={styles.toolDesc}>{tool.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={INACTIVE} />
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Coming Soon</Text>
      <View style={styles.comingSoonGrid}>
        {COMING_SOON.map((item) => (
          <View key={item.id} style={styles.comingSoonCard}>
            <Ionicons name={item.icon} size={26} color={INACTIVE} style={{ marginBottom: 8 }} />
            <Text style={styles.comingSoonLabel}>{item.label}</Text>
            <Text style={styles.comingSoonDesc}>{item.description}</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Soon</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 40 },
  heroSection: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    marginBottom: 20,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 14, color: INACTIVE, marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolCardLast: { marginBottom: 0 },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { flex: 1 },
  toolLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  toolDesc: { fontSize: 13, color: INACTIVE, marginTop: 2 },
  comingSoonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  comingSoonCard: {
    width: '46%',
    flex: 1,
    minWidth: 140,
    backgroundColor: BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderStyle: 'dashed',
    position: 'relative',
  },
  comingSoonLabel: { fontSize: 14, fontWeight: '700', color: INACTIVE },
  comingSoonDesc: { fontSize: 12, color: '#AAA', marginTop: 4, lineHeight: 17 },
  soonBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonBadgeText: { fontSize: 11, fontWeight: '700', color: DARK },
});
