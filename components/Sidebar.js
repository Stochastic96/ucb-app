import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { logout } from '../services/auth';
import { navigationRef } from '../navigation/navigationRef';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ERROR, BORDER, ACCENT } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

const NAV_ITEMS = [
  { label: 'Home', icon: 'home-outline', activeIcon: 'home', target: 'tab', name: 'Home' },
  { label: 'Tools', icon: 'grid-outline', activeIcon: 'grid', target: 'tab', name: 'Tools' },
  { label: 'Guide', icon: 'book-outline', activeIcon: 'book', target: 'tab', name: 'Guide' },
  { label: 'Map', icon: 'map-outline', activeIcon: 'map', target: 'tab', name: 'Map' },
];

const ACCOUNT_ITEMS = [
  { label: 'Profile', icon: 'person-outline', target: 'stack', name: 'Profile' },
  { label: 'Settings', icon: 'settings-outline', target: 'stack', name: 'Settings' },
];

const QUICK_LINKS = [
  {
    label: 'QIS — Grades & Exams',
    icon: 'school-outline',
    url: 'https://qis.hochschule-trier.de/',
  },
  {
    label: 'Student Portal',
    icon: 'globe-outline',
    url: 'https://idp.fh-trier.de/idp/profile/SAML2/Redirect/SSO?execution=e5s1&lang=en',
  },
];

export default function Sidebar() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const closeSidebar = useStore((s) => s.closeSidebar);
  const user = useStore((s) => s.user);

  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (sidebarOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 200,
          mass: 0.8,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sidebarOpen]);

  const navigateTo = (item) => {
    closeSidebar();
    setTimeout(() => {
      if (!navigationRef.isReady()) return;
      if (item.target === 'tab') {
        navigationRef.navigate('Main', { screen: item.name });
      } else {
        navigationRef.navigate(item.name);
      }
    }, 150);
  };

  const openLink = (url) => {
    closeSidebar();
    Linking.openURL(url).catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to log in again to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          closeSidebar();
          await logout();
        },
      },
    ]);
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <Modal
      visible={sidebarOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSidebar}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeSidebar}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateX: slideAnim }], paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* User header */}
        <View style={[styles.userHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.fullName ?? 'Student'}
            </Text>
            <Text style={styles.userSub} numberOfLines={1}>
              {user?.username ? `@${user.username}` : 'UCB'}
            </Text>
          </View>
          <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn} hitSlop={12} accessibilityLabel="Close menu" accessibilityRole="button">
            <Ionicons name="close" size={22} color={INACTIVE} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {/* Navigation */}
          <SidebarSection label="Navigate">
            {NAV_ITEMS.map((item) => (
              <SidebarRow
                key={item.name}
                icon={item.icon}
                label={item.label}
                onPress={() => navigateTo(item)}
              />
            ))}
          </SidebarSection>

          {/* Account */}
          <SidebarSection label="Account">
            {ACCOUNT_ITEMS.map((item) => (
              <SidebarRow
                key={item.name}
                icon={item.icon}
                label={item.label}
                onPress={() => navigateTo(item)}
              />
            ))}
          </SidebarSection>

          {/* Quick Links */}
          <SidebarSection label="Quick Links">
            {QUICK_LINKS.map((link) => (
              <SidebarRow
                key={link.label}
                icon={link.icon}
                label={link.label}
                onPress={() => openLink(link.url)}
                external
              />
            ))}
          </SidebarSection>
        </ScrollView>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7} accessibilityLabel="Log out" accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={ERROR} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

function SidebarSection({ label, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SidebarRow({ icon, label, onPress, external }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityLabel={label} accessibilityRole="menuitem">
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={19} color={DARK} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={16}
        color={INACTIVE}
        style={{ marginLeft: 'auto' }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: SURFACE,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
    elevation: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 17, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  userSub: { fontSize: 13, color: INACTIVE, marginTop: 1 },
  closeBtn: { padding: 4 },
  section: { marginTop: 20, paddingHorizontal: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: BG,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    gap: 12,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: ERROR },
});
