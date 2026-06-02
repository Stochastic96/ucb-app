import React, { useEffect } from 'react';
import { trackScreen } from '../../services/analytics';
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
import { useTranslation } from '../../services/i18n';

// Active tools — fully functional
const TOOLS = [
  { id: 'timetable', labelKey: 'tool_timetable', descKey: 'tool_timetable_desc', icon: 'calendar-outline', iconColor: '#2196F3', iconBg: '#E3F2FD', screen: 'Timetable' },
  { id: 'mensa', labelKey: 'tool_mensa', descKey: 'tool_mensa_desc', icon: 'restaurant-outline', iconColor: '#4CAF50', iconBg: '#E8F5E9', screen: 'Mensa' },
  { id: 'calendar', labelKey: 'tool_semester', descKey: 'tool_semester_desc', icon: 'calendar-number-outline', iconColor: '#6FAE3E', iconBg: '#EDF6E5', screen: 'SemesterCalendar' },
  { id: 'exams', labelKey: 'tool_exam_reg', descKey: 'tool_exam_reg_desc', icon: 'school-outline', iconColor: '#E65100', iconBg: '#FBE9E7', screen: 'ExamTracker' },
  { id: 'events', labelKey: 'tool_events', descKey: 'tool_events_desc', icon: 'football-outline', iconColor: '#E91E63', iconBg: '#FCE4EC', screen: 'EventsList', rootScreen: true },
  { id: 'courses', labelKey: 'tool_courses', descKey: 'tool_courses_desc', icon: 'albums-outline', iconColor: '#3F51B5', iconBg: '#E8EAF6', screen: 'CoursesList', rootScreen: true },
  { id: 'news', labelKey: 'tool_news', descKey: 'tool_news_desc', icon: 'newspaper-outline', iconColor: '#FF9800', iconBg: '#FFF3E0', screen: 'NewsFeed', rootScreen: true },
  { id: 'planner', labelKey: 'tool_planner', descKey: 'tool_planner_desc', icon: 'checkmark-circle-outline', iconColor: '#9C27B0', iconBg: '#F3E5F5', screen: 'PlannerList' },
  { id: 'resources', labelKey: 'tool_resources', descKey: 'tool_resources_desc', icon: 'bicycle-outline', iconColor: '#00796B', iconBg: '#E0F2F1', screen: 'CampusResources' },
  { id: 'platforms', labelKey: 'tool_platforms', descKey: 'tool_platforms_desc', icon: 'grid-outline', iconColor: '#0369A1', iconBg: '#E0F2FE', screen: 'CampusPlatforms' },
  { id: 'library-booking', labelKey: 'tool_library', descKey: 'tool_library_desc', icon: 'library-outline', iconColor: '#5C6BC0', iconBg: '#E8EAF6', externalUrl: 'https://www.supersaas.co.uk/schedule/UCBib/UCBib-Arbeitsraum?lang=uk' },
];

const COMING_SOON = [];

export default function ToolsScreen({ navigation, route }) {
  const t = useTranslation();
  useEffect(() => { trackScreen('ToolsScreen'); }, []);
  useEffect(() => {
    if (route.params?.openTimetable) {
      navigation.setParams({ openTimetable: undefined });
      navigation.navigate('Timetable');
    }
  }, [route.params?.openTimetable]);

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
        <Text style={styles.heroTitle}>{t('tools_hero_title')}</Text>
        <Text style={styles.heroSub}>{t('tools_hero_sub')}</Text>
      </View>

      {TOOLS.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={styles.toolCard}
          onPress={() => navigateTo(tool)}
          activeOpacity={0.75}
          accessibilityLabel={`${t(tool.labelKey)}: ${t(tool.descKey)}`}
          accessibilityRole="button"
        >
          <View style={[styles.toolIcon, { backgroundColor: tool.iconBg }]}>
            <Ionicons name={tool.icon} size={24} color={tool.iconColor} />
          </View>
          <View style={styles.toolText}>
            <Text style={styles.toolLabel}>{t(tool.labelKey)}</Text>
            <Text style={styles.toolDesc}>{t(tool.descKey)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={INACTIVE} />
        </TouchableOpacity>
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
