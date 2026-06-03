import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import MapScreen from '../screens/map/MapScreen';
import GuideStack from './GuideStack';
import ToolsStack from './ToolsStack';
import OfflineBanner from '../components/OfflineBanner';
import useStore from '../store/useStore';
import { PRIMARY, INACTIVE } from '../constants/colors';
import { t } from '../services/i18n';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: ['home', 'home-outline'],
  Tools: ['grid', 'grid-outline'],
  Guide: ['book', 'book-outline'],
  Map: ['map', 'map-outline'],
};

function MenuButton() {
  const openSidebar = useStore((s) => s.openSidebar);
  return (
    <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 8 }} accessibilityLabel={t('nav_open_menu')} accessibilityRole="button">
      <Ionicons name="menu" size={24} color={PRIMARY} />
    </TouchableOpacity>
  );
}

export default function MainTabs() {
  const unreadNewsCount = useStore((s) => s.unreadNewsCount);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // Pre-render all tabs so nested stacks are initialised before any
          // programmatic navigation reaches them. Without this, navigating to
          // a nested screen (e.g. Tools → Timetable) on a tab that hasn't been
          // visited yet drops the initial screen (ToolsHome) from the back stack,
          // leaving the user with no back button.
          lazy: false,
          tabBarIcon: ({ color, size, focused }) => {
            const [active, inactive] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
            return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
          },
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: INACTIVE,
          headerShown: route.name !== 'Home',
          headerRight: () => <MenuButton />,
          headerTintColor: PRIMARY,
          headerStyle: { backgroundColor: '#fff' },
          headerShadowVisible: true,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: t('tab_home'),
            tabBarBadge: unreadNewsCount > 0 ? unreadNewsCount : undefined,
            tabBarAccessibilityLabel: t('tab_home_a11y'),
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsStack}
          options={{ headerShown: false, tabBarLabel: t('tab_tools'), tabBarAccessibilityLabel: t('tab_tools_a11y') }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Tools', { screen: 'ToolsHome' });
            },
          })}
        />
        <Tab.Screen
          name="Guide"
          component={GuideStack}
          options={{ headerShown: false, tabBarLabel: t('tab_guide'), tabBarAccessibilityLabel: t('tab_guide_a11y') }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Guide', { screen: 'GuideHome' });
            },
          })}
        />
        <Tab.Screen name="Map" component={MapScreen} options={{ title: t('tab_map'), tabBarLabel: t('tab_map'), tabBarAccessibilityLabel: t('tab_map_a11y') }} />
      </Tab.Navigator>
    </View>
  );
}
