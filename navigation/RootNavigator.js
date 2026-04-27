import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useStore from '../store/useStore';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NewsFeedScreen from '../screens/news/NewsFeedScreen';
import GuideStack from './GuideStack';
import { PRIMARY } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: true, title: 'Settings', headerTintColor: PRIMARY }}
          />
          <Stack.Screen
            name="NewsFeed"
            component={NewsFeedScreen}
            options={{ headerShown: true, title: 'News', headerTintColor: PRIMARY }}
          />
          <Stack.Screen
            name="Guide"
            component={GuideStack}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
