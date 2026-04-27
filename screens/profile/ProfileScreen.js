import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapSessionData } from '../../services/bootstrap';
import { logout } from '../../services/auth';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG, ERROR, BORDER } from '../../constants/colors';

function formatLastUpdated(date) {
  if (!date) return '';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ProfileScreen({ navigation }) {
  const profile = useStore((s) => s.user);
  const courseCount = useStore((s) => s.courses.length);
  const dataReady = useStore((s) => s.dataReady);
  const isHydrating = useStore((s) => s.isHydrating);
  const bootstrapError = useStore((s) => s.bootstrapError);
  const userId = useStore((s) => s.userId);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const [loading, setLoading] = useState(!profile);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const loadProfile = useCallback(async (force = false) => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      await bootstrapSessionData(force);
    } catch {
      // rendered from global bootstrapError
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!dataReady && !isHydrating) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [dataReady, isHydrating, loadProfile, userId]);

  const onRefresh = () => { setRefreshing(true); loadProfile(true); };

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
  };

  const openRootScreen = (screenName) => {
    const parent = navigation.getParent();
    if (parent) { parent.navigate(screenName); return; }
    navigation.navigate(screenName);
  };

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  // Logout button and dialog — always rendered
  const logoutSection = (
    <>
      <TouchableOpacity style={styles.logoutButton} onPress={() => setLogoutVisible(true)}>
        <Ionicons name="log-out-outline" size={20} color={ERROR} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      <Portal>
        <Dialog visible={logoutVisible} onDismiss={() => setLogoutVisible(false)}>
          <Dialog.Title>Log out?</Dialog.Title>
          <Dialog.Content>
            <Text>You will need to log in again to access your data.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutVisible(false)}>Cancel</Button>
            <Button textColor={ERROR} onPress={handleLogout}>Logout</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={{ padding: 24, flex: 1 }}>
          <SkeletonLoader lines={4} avatar />
        </View>
        {logoutSection}
      </View>
    );
  }

  if (bootstrapError && !profile) {
    return (
      <View style={styles.screen}>
        <ErrorState
          type={bootstrapError.type}
          onRetry={() => {
            setLoading(true);
            loadProfile(true);
          }}
        />
        {logoutSection}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.fullName}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {lastSyncAt && (
            <Text style={styles.cacheNote}>Last updated {formatLastUpdated(lastSyncAt)}</Text>
          )}
        </View>

        <View style={styles.card}>
          <InfoRow icon="mail-outline" label="Email" value={profile?.email || '—'} />
          <InfoRow icon="person-outline" label="Username" value={profile?.username || '—'} />
          <InfoRow icon="book-outline" label="Enrolled Courses" value={String(courseCount)} />
        </View>

        <View style={styles.card}>
          <LinkRow icon="albums-outline" label="My Courses" onPress={() => openRootScreen('CoursesList')} />
          <LinkRow icon="settings-outline" label="Settings" onPress={() => openRootScreen('Settings')} />
          <LinkRow icon="compass-outline" label="Survival Guide" onPress={() => navigation.navigate('Guide')} last />
        </View>
      </ScrollView>

      {logoutSection}
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={PRIMARY} style={styles.rowIcon} />
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({ icon, label, onPress, last }) {
  return (
    <TouchableOpacity style={[styles.linkRow, !last && styles.linkRowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={PRIMARY} style={styles.rowIcon} />
      <Text style={styles.linkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={INACTIVE} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACE },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: BG },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  initials: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  username: { fontSize: 14, color: INACTIVE, marginTop: 2 },
  cacheNote: { fontSize: 11, color: INACTIVE, marginTop: 6 },
  card: { backgroundColor: BG, marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon: { marginRight: 14 },
  rowLabel: { fontSize: 11, color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 15, color: '#1A1A1A', marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  linkLabel: { fontSize: 15, color: '#1A1A1A' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, padding: 16, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: ERROR, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: ERROR },
});
