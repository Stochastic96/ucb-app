import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ToolsScreen from '../screens/tools/ToolsScreen';
import TimetableScreen from '../screens/timetable/TimetableScreen';
import MensaScreen from '../screens/mensa/MensaScreen';
import SemesterCalendarScreen from '../screens/calendar/SemesterCalendarScreen';
import CampusResourcesScreen from '../screens/resources/CampusResourcesScreen';
import PlannerScreen from '../screens/planner/PlannerScreen';
import AddDeadlineScreen from '../screens/planner/AddDeadlineScreen';
import ExamTrackerScreen from '../screens/exams/ExamTrackerScreen';
import ExamPlannerScreen from '../screens/exams/ExamPlannerScreen';
import CampusPlatformsScreen from '../screens/collaboration/CampusPlatformsScreen';
import useStore from '../store/useStore';
import { useTheme } from '../theme/ThemeProvider';
import { t } from '../services/i18n';

const Stack = createNativeStackNavigator();

function MenuButton() {
  const c = useTheme();
  const openSidebar = useStore((s) => s.openSidebar);
  return (
    <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 4 }}>
      <Ionicons name="menu" size={24} color={c.primary} />
    </TouchableOpacity>
  );
}

export default function ToolsStack() {
  const c = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: c.primary,
        headerStyle: { backgroundColor: c.surface },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="ToolsHome"
        component={ToolsScreen}
        options={{ title: t('screen_tools'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{ title: t('screen_timetable'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="Mensa"
        component={MensaScreen}
        options={{ title: t('screen_mensa'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="SemesterCalendar"
        component={SemesterCalendarScreen}
        options={{ title: t('screen_semester_calendar'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="CampusResources"
        component={CampusResourcesScreen}
        options={{ title: t('screen_campus_resources'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="PlannerList"
        component={PlannerScreen}
        options={{ title: t('screen_planner'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="AddDeadline"
        component={AddDeadlineScreen}
        options={({ route }) => ({
          title: route.params?.deadline ? t('screen_edit_deadline') : t('screen_add_deadline'),
          headerRight: () => <MenuButton />,
        })}
      />
      <Stack.Screen
        name="ExamTracker"
        component={ExamTrackerScreen}
        options={{ title: t('screen_exam_tracker'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="ExamPlanner"
        component={ExamPlannerScreen}
        options={({ route }) => ({
          title: route.params?.courseTitle ?? t('screen_exam_plan'),
          headerRight: () => <MenuButton />,
        })}
      />
      <Stack.Screen
        name="CampusPlatforms"
        component={CampusPlatformsScreen}
        options={{ title: t('screen_campus_platforms'), headerRight: () => <MenuButton /> }}
      />
    </Stack.Navigator>
  );
}
