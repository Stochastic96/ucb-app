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
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import LegalScreen from '../screens/legal/LegalScreen';
import FactScreen from '../screens/facts/FactScreen';
import { PRIMARY } from '../constants/colors';
import { t } from '../services/i18n';

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
              title: t('screen_profile'),
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: t('screen_settings'),
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="NewsFeed"
            component={NewsFeedScreen}
            options={{
              headerShown: true,
              title: t('screen_news'),
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="CoursesList"
            component={CoursesScreen}
            options={{
              headerShown: true,
              title: t('screen_courses'),
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="CourseDetail"
            component={CourseDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params?.title ?? t('screen_course'),
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
            name="FactOfTheDay"
            component={FactScreen}
            options={{
              headerShown: true,
              title: t('fact_screen_title'),
              headerTintColor: PRIMARY,
              headerRight: () => <MenuButton />,
            }}
          />
          <Stack.Screen
            name="Impressum"
            component={ImpressumScreen}
            options={{ headerShown: true, title: t('screen_impressum'), headerTintColor: PRIMARY }}
          />
          <Stack.Screen
            name="Datenschutz"
            component={DatenschutzScreen}
            options={{ headerShown: true, title: t('screen_datenschutz'), headerTintColor: PRIMARY }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{ headerShown: true, title: t('settings_privacy_policy'), headerTintColor: PRIMARY }}
          />
          <Stack.Screen
            name="LegalNotice"
            component={LegalScreen}
            options={{ headerShown: true, title: t('settings_legal_notice'), headerTintColor: PRIMARY }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
