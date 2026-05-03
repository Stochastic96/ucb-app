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
    <TouchableOpacity onPress={openSidebar} hitSlop={12} style={{ marginRight: 8 }}>
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
          tabBarIcon: ({ color, size, focused }) => {
            const [active, inactive] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
            return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
          },
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: INACTIVE,
          // Home manages its own header visually — hide nav header for it
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
            tabBarBadge: unreadNewsCount > 0 ? unreadNewsCount : undefined,
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsStack}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="Guide" component={GuideStack} options={{ headerShown: false }} />
        <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Campus Map' }} />
      </Tab.Navigator>
    </View>
  );
}
