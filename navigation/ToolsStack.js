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
import useStore from '../store/useStore';
import { PRIMARY } from '../constants/colors';

const Stack = createNativeStackNavigator();

function MenuButton() {
  const openSidebar = useStore((s) => s.openSidebar);
  return (
    <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 4 }}>
      <Ionicons name="menu" size={24} color={PRIMARY} />
    </TouchableOpacity>
  );
}

export default function ToolsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: PRIMARY,
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="ToolsHome"
        component={ToolsScreen}
        options={{ title: 'Tools', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{ title: 'Timetable', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="Mensa"
        component={MensaScreen}
        options={{ title: 'Mensa Menu', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="SemesterCalendar"
        component={SemesterCalendarScreen}
        options={{ title: 'Semester Calendar', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="CampusResources"
        component={CampusResourcesScreen}
        options={{ title: 'Campus Resources', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="PlannerList"
        component={PlannerScreen}
        options={{ title: 'Deadline Planner', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="AddDeadline"
        component={AddDeadlineScreen}
        options={({ route }) => ({
          title: route.params?.deadline ? 'Edit Deadline' : 'Add Deadline',
          headerRight: () => <MenuButton />,
        })}
      />
      <Stack.Screen
        name="ExamTracker"
        component={ExamTrackerScreen}
        options={{ title: 'Exam Registration', headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="ExamPlanner"
        component={ExamPlannerScreen}
        options={({ route }) => ({
          title: route.params?.courseTitle ?? 'Exam Plan',
          headerRight: () => <MenuButton />,
        })}
      />
    </Stack.Navigator>
  );
}
