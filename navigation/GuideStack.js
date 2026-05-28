import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import GuideScreen from '../screens/guide/GuideScreen';
import GuideDetailScreen from '../screens/guide/GuideDetailScreen';
import useStore from '../store/useStore';
import { PRIMARY } from '../constants/colors';
import { t } from '../services/i18n';

const Stack = createNativeStackNavigator();

function MenuButton() {
  const openSidebar = useStore((s) => s.openSidebar);
  return (
    <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 4 }}>
      <Ionicons name="menu" size={24} color={PRIMARY} />
    </TouchableOpacity>
  );
}

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
        options={{ title: t('screen_survival_guide'), headerRight: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="GuideDetail"
        component={GuideDetailScreen}
        options={({ route }) => ({
          title: route.params?.title ?? t('screen_guide'),
          headerRight: () => <MenuButton />,
        })}
      />
    </Stack.Navigator>
  );
}
