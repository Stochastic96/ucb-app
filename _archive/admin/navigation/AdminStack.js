import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PRIMARY } from '../constants/colors';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import MensaAdminScreen from '../screens/admin/MensaAdminScreen';
import EventsAdminScreen from '../screens/admin/EventsAdminScreen';
import SportsAdminScreen from '../screens/admin/SportsAdminScreen';
import { GuideAdminScreen, GuideCategoryAdminScreen } from '../screens/admin/GuideAdminScreen';
import ResourcesAdminScreen from '../screens/admin/ResourcesAdminScreen';
import CalendarAdminScreen from '../screens/admin/CalendarAdminScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: PRIMARY,
        headerBackTitle: '',
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin', headerBackVisible: false }}
      />
      <Stack.Screen name="MensaAdmin"     component={MensaAdminScreen}         options={{ title: 'Speiseplan verwalten' }} />
      <Stack.Screen name="EventsAdmin"    component={EventsAdminScreen}        options={{ title: 'Veranstaltungen' }} />
      <Stack.Screen name="SportsAdmin"    component={SportsAdminScreen}        options={{ title: 'Sportplan' }} />
      <Stack.Screen name="GuideAdmin"     component={GuideAdminScreen}         options={{ title: 'Guide-Inhalte' }} />
      <Stack.Screen name="GuideCategoryAdmin" component={GuideCategoryAdminScreen} options={({ route }) => ({ title: route.params?.label ?? 'Guide' })} />
      <Stack.Screen name="ResourcesAdmin" component={ResourcesAdminScreen}     options={{ title: 'Campus-Angebote' }} />
      <Stack.Screen name="CalendarAdmin"  component={CalendarAdminScreen}      options={{ title: 'Semesterkalender' }} />
    </Stack.Navigator>
  );
}
