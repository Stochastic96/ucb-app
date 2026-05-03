import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import SettingsScreen from '../screens/profile/SettingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NewsFeedScreen from '../screens/news/NewsFeedScreen';
import CourseDetailScreen from '../screens/courses/CourseDetailScreen';
import CoursesScreen from '../screens/courses/CoursesScreen';
import EventsStack from './EventsStack';
import ImpressumScreen from '../screens/legal/ImpressumScreen';
import DatenschutzScreen from '../screens/legal/DatenschutzScreen';
import { PRIMARY } from '../constants/colors';

const Stack = createNativeStackNavigator();

function MenuButton() {
  const openSidebar = useStore((s) => s.openSidebar);
  return (
    <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 8 }}>
      <Ionicons name="menu" size={24} color={PRIMARY} />
    </TouchableOpacity>
  );
}

export default function RootNavigator() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true,
              title: 'Profile',
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: 'Settings',
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="NewsFeed"
            component={NewsFeedScreen}
            options={{
              headerShown: true,
              title: 'News',
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="CoursesList"
            component={CoursesScreen}
            options={{
              headerShown: true,
              title: 'My Courses',
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="CourseDetail"
            component={CourseDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params?.title ?? 'Course',
              headerTintColor: PRIMARY,
              headerBackTitle: '',
              headerRight: () => <MenuButton />,
            })}
          />
          <Stack.Screen
            name="EventsList"
            component={EventsStack}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Impressum"
            component={ImpressumScreen}
            options={{ headerShown: true, title: 'Impressum', headerTintColor: PRIMARY }}
          />
          <Stack.Screen
            name="Datenschutz"
            component={DatenschutzScreen}
            options={{ headerShown: true, title: 'Datenschutzerklärung', headerTintColor: PRIMARY }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
