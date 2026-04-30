import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventsScreen from '../screens/events/EventsScreen';

const Stack = createNativeStackNavigator();

export default function EventsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventsMain" component={EventsScreen} />
    </Stack.Navigator>
  );
}
