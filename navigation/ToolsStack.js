import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ToolsScreen from '../screens/tools/ToolsScreen';
import TimetableScreen from '../screens/timetable/TimetableScreen';
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
    </Stack.Navigator>
  );
}
