import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT } from '../../constants/colors';

// Active tools — fully functional
const TOOLS = [
  {
    id: 'timetable',
    label: 'Timetable',
    description: 'Your weekly class schedule',
    icon: 'calendar-outline',
    iconColor: '#2196F3',
    iconBg: '#E3F2FD',
    screen: 'Timetable',
  },
  {
    id: 'mensa',
    label: 'Mensa Menu',
    description: "This week's lunch menu · Vegan Monday 🌱",
    icon: 'restaurant-outline',
    iconColor: '#4CAF50',
    iconBg: '#E8F5E9',
    screen: 'Mensa',
  },
  {
    id: 'calendar',
    label: 'Semester Planner',
    description: 'Key dates, courses & exam planning',
    icon: 'calendar-number-outline',
    iconColor: '#6FAE3E',
    iconBg: '#EDF6E5',
    screen: 'SemesterCalendar',
  },
  {
    id: 'exams',
    label: 'Exam Registration',
    description: 'Track registrations · Plan exam details',
    icon: 'school-outline',
    iconColor: '#E65100',
    iconBg: '#FBE9E7',
    screen: 'ExamTracker',
  },
  {
    id: 'events',
    label: 'Events & Sports',
    description: 'Campus events and sports schedule',
    icon: 'football-outline',
    iconColor: '#E91E63',
    iconBg: '#FCE4EC',
    screen: 'EventsList',
    rootScreen: true,
  },
  {
    id: 'courses',
    label: 'My Courses',
    description: 'Files, announcements and course details',
    icon: 'albums-outline',
    iconColor: '#3F51B5',
    iconBg: '#E8EAF6',
    screen: 'CoursesList',
    rootScreen: true,
  },
  {
    id: 'news',
    label: 'News',
    description: 'University and course updates',
    icon: 'newspaper-outline',
    iconColor: '#FF9800',
    iconBg: '#FFF3E0',
    screen: 'NewsFeed',
    rootScreen: true,
  },
  {
    id: 'library-booking',
    label: 'Library Room Booking',
    description: 'Reserve a study room via UCBib',
    icon: 'library-outline',
    iconColor: '#5C6BC0',
    iconBg: '#E8EAF6',
    externalUrl: 'https://www.supersaas.co.uk/schedule/UCBib/UCBib-Arbeitsraum?lang=uk',
  },
];

// Coming soon — code exists, just hidden until activated
const COMING_SOON = [
  {
    id: 'planner',
    label: 'Deadline Planner',
    description: 'Track portfolios, submissions & presentations with reminders',
    icon: 'checkmark-circle-outline',
    iconColor: '#9C27B0',
    iconBg: '#F3E5F5',
  },
  {
    id: 'resources',
    label: 'Campus Resources',
    description: 'Bike rental, Green Office events, sports & more',
    icon: 'bicycle-outline',
    iconColor: '#00796B',
    iconBg: '#E0F2F1',
  },
];

export default function ToolsScreen({ navigation }) {
  const navigateTo = (tool) => {
    if (tool.externalUrl) {
      Linking.openURL(tool.externalUrl);
      return;
    }
    if (tool.rootScreen) {
      navigation.getParent()?.getParent()?.navigate(tool.screen);
    } else {
      navigation.navigate(tool.screen);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Student Tools</Text>
        <Text style={styles.heroSub}>Everything you need — all in one place</Text>
      </View>

      {/* Active tools */}
      <Text style={styles.sectionLabel}>Available</Text>
      {TOOLS.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={styles.toolCard}
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

      {/* Coming soon */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Coming Soon</Text>
      {COMING_SOON.map((item) => (
        <View key={item.id} style={styles.comingSoonCard}>
          <View style={[styles.toolIcon, { backgroundColor: item.iconBg, opacity: 0.6 }]}>
            <Ionicons name={item.icon} size={24} color={item.iconColor} />
          </View>
          <View style={styles.toolText}>
            <View style={styles.comingSoonTitleRow}>
              <Text style={styles.comingSoonLabel}>{item.label}</Text>
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>Soon</Text>
              </View>
            </View>
            <Text style={styles.comingSoonDesc}>{item.description}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
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
    marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 13, color: INACTIVE, marginTop: 3 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { flex: 1 },
  toolLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  toolDesc: { fontSize: 13, color: INACTIVE, marginTop: 2 },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderStyle: 'dashed',
    opacity: 0.75,
  },
  comingSoonTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  comingSoonLabel: { fontSize: 16, fontWeight: '700', color: INACTIVE },
  comingSoonDesc: { fontSize: 13, color: '#BBB', marginTop: 1 },
  soonBadge: {
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  soonBadgeText: { fontSize: 11, fontWeight: '700', color: DARK },
});
