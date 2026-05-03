import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT } from '../../constants/colors';

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
    label: 'Semester Calendar',
    description: 'Key dates, deadlines & exam periods',
    icon: 'calendar-number-outline',
    iconColor: '#6FAE3E',
    iconBg: '#EDF6E5',
    screen: 'SemesterCalendar',
  },
  {
    id: 'planner',
    label: 'Deadline Planner',
    description: 'Track submissions, portfolios & presentations',
    icon: 'checkmark-circle-outline',
    iconColor: '#9C27B0',
    iconBg: '#F3E5F5',
    screen: 'PlannerList',
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
    id: 'resources',
    label: 'Campus Resources',
    description: 'Bikes, sports, Green Office & more',
    icon: 'bicycle-outline',
    iconColor: '#00796B',
    iconBg: '#E0F2F1',
    screen: 'CampusResources',
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
];

export default function ToolsScreen({ navigation }) {
  const navigateTo = (tool) => {
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
    marginBottom: 10,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 13, color: INACTIVE, marginTop: 3 },
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
});
