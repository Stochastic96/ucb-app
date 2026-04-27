import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import CoursesStack from './CoursesStack';
import TimetableScreen from '../screens/timetable/TimetableScreen';
import MapScreen from '../screens/map/MapScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import OfflineBanner from '../components/OfflineBanner';
import useStore from '../store/useStore';
import { PRIMARY, INACTIVE } from '../constants/colors';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: ['home', 'home-outline'],
  Courses: ['book', 'book-outline'],
  Timetable: ['calendar', 'calendar-outline'],
  Map: ['map', 'map-outline'],
  Profile: ['person', 'person-outline'],
};

export default function MainTabs() {
  const unreadNewsCount = useStore((s) => s.unreadNewsCount);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => {
            const [active, inactive] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
            return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
          },
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: INACTIVE,
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarBadge: unreadNewsCount > 0 ? unreadNewsCount : undefined,
          }}
        />
        <Tab.Screen name="Courses" component={CoursesStack} />
        <Tab.Screen name="Timetable" component={TimetableScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}
