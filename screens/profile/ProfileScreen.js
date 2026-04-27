import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Dialog, Portal, Button, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfile, fetchProfileCourseCount } from '../../services/profile';
import { logout } from '../../services/auth';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import { PRIMARY, DARK, INACTIVE, SURFACE, BG, ERROR } from '../../constants/colors';

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
  const [profile, setProfile] = useState(null);
  const [courseCount, setCourseCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const loadProfile = useCallback(async (force = false) => {
    try {
      setError(null);
      const result = await fetchProfile(force);
      setProfile(result.data);
      setLastUpdated(result.lastUpdated);
      setIsCached(result.isCached ?? false);
      const count = await fetchProfileCourseCount(result.data.id);
      setCourseCount(count);
    } catch (e) {
      setError(e.type ?? 'UNKNOWN');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile(true);
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
  };

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 24 }}>
          <SkeletonLoader lines={4} avatar />
        </View>
      </View>
    );
  }

  if (error && !profile) {
    return <ErrorState type={error} onRetry={() => { setLoading(true); loadProfile(); }} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
    >
      {/* Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
        {isCached && lastUpdated && (
          <Text style={styles.cacheNote}>Last updated {formatLastUpdated(lastUpdated)}</Text>
        )}
      </View>

      {/* Info cards */}
      <View style={styles.card}>
        <InfoRow icon="mail-outline" label="Email" value={profile?.email || '—'} />
        <InfoRow icon="person-outline" label="Username" value={profile?.username || '—'} />
        {courseCount !== null && (
          <InfoRow icon="book-outline" label="Enrolled Courses" value={String(courseCount)} />
        )}
      </View>

      {/* Navigation links */}
      <View style={styles.card}>
        <LinkRow
          icon="settings-outline"
          label="Settings"
          onPress={() => navigation.navigate('Settings')}
        />
        <LinkRow
          icon="compass-outline"
          label="Survival Guide"
          onPress={() => navigation.navigate('Guide')}
          last
        />
      </View>

      {/* Logout */}
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
    </ScrollView>
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
    <TouchableOpacity
      style={[styles.linkRow, !last && styles.linkRowBorder]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={PRIMARY} style={styles.rowIcon} />
      <Text style={styles.linkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={INACTIVE} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: BG },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  initials: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  username: { fontSize: 14, color: INACTIVE, marginTop: 2 },
  cacheNote: { fontSize: 11, color: INACTIVE, marginTop: 6 },
  card: {
    backgroundColor: BG,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon: { marginRight: 14 },
  rowLabel: { fontSize: 11, color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 15, color: '#1A1A1A', marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  linkLabel: { fontSize: 15, color: '#1A1A1A' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ERROR,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: ERROR },
});
