import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { toolIconColor } from '../../constants/colors';
import ListRow from '../../components/ListRow';
import { openExternalUrl } from '../../services/linking';

// Active tools — fully functional
const TOOLS = [
  { id: 'timetable', labelKey: 'tool_timetable', descKey: 'tool_timetable_desc', icon: 'calendar-outline', screen: 'Timetable' },
  { id: 'mensa', labelKey: 'tool_mensa', descKey: 'tool_mensa_desc', icon: 'restaurant-outline', screen: 'Mensa' },
  { id: 'calendar', labelKey: 'tool_semester', descKey: 'tool_semester_desc', icon: 'calendar-number-outline', screen: 'SemesterCalendar' },
  { id: 'exams', labelKey: 'tool_exam_reg', descKey: 'tool_exam_reg_desc', icon: 'school-outline', screen: 'ExamTracker' },
  { id: 'events', labelKey: 'tool_events', descKey: 'tool_events_desc', icon: 'football-outline', screen: 'EventsList', rootScreen: true },
  { id: 'courses', labelKey: 'tool_courses', descKey: 'tool_courses_desc', icon: 'albums-outline', screen: 'CoursesList', rootScreen: true },
  { id: 'news', labelKey: 'tool_news', descKey: 'tool_news_desc', icon: 'newspaper-outline', screen: 'NewsFeed', rootScreen: true },
  { id: 'planner', labelKey: 'tool_planner', descKey: 'tool_planner_desc', icon: 'checkmark-circle-outline', screen: 'PlannerList' },
  { id: 'campus', labelKey: 'tool_campus', descKey: 'tool_campus_desc', icon: 'people-outline', screen: 'CampusRadar' },
  { id: 'waste', labelKey: 'tool_waste', descKey: 'tool_waste_desc', icon: 'trash-outline', screen: 'WasteGuide' },
  { id: 'resources', labelKey: 'tool_resources', descKey: 'tool_resources_desc', icon: 'bicycle-outline', screen: 'CampusResources' },
  { id: 'platforms', labelKey: 'tool_platforms', descKey: 'tool_platforms_desc', icon: 'grid-outline', screen: 'CampusPlatforms' },
  { id: 'library-booking', labelKey: 'tool_library', descKey: 'tool_library_desc', icon: 'library-outline', externalUrl: 'https://www.supersaas.co.uk/schedule/UCBib/UCBib-Arbeitsraum?lang=uk' },
];

export default function ToolsScreen({ navigation, route }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (route.params?.openTimetable) {
      navigation.setParams({ openTimetable: undefined });
      navigation.navigate('Timetable');
    }
  }, [route.params?.openTimetable]);

  const navigateTo = (tool) => {
    if (tool.externalUrl) {
      openExternalUrl(tool.externalUrl);
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
        <ListRow
          key={tool.id}
          icon={tool.icon}
          iconColor={toolIconColor(tool.id, c.mode)}
          title={t(tool.labelKey)}
          subtitle={t(tool.descKey)}
          onPress={() => navigateTo(tool)}
        />
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
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
    marginBottom: 14,
  },
  heroTitle: { ...c.type.titleLg, color: c.text },
  heroSub: { ...c.type.bodySm, color: c.textMuted, marginTop: 3 },
});
