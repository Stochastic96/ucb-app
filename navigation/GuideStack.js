import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GuideScreen from '../screens/guide/GuideScreen';
import GuideDetailScreen from '../screens/guide/GuideDetailScreen';
import { PRIMARY } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function GuideStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: PRIMARY,
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="GuideHome"
        component={GuideScreen}
        options={{ title: 'Survival Guide' }}
      />
      <Stack.Screen
        name="GuideDetail"
        component={GuideDetailScreen}
        options={({ route }) => ({ title: route.params?.title ?? 'Guide' })}
      />
    </Stack.Navigator>
  );
}
