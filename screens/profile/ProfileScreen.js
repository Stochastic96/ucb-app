import React, { useState, useEffect, useCallback } from 'react';
import { trackScreen } from '../../services/analytics';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapSessionData } from '../../services/bootstrap';
import { logout } from '../../services/auth';
import SkeletonLoader from '../../components/SkeletonLoader';
import ErrorState from '../../components/ErrorState';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG, ERROR, BORDER } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

function formatLastUpdated(date) {
  if (!date) return '';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PORTAL_LINKS = [
  {
    id: 'qis',
    labelKey: 'profile_qis_label',
    descKey: 'profile_qis_desc',
    icon: 'school-outline',
    url: 'https://qis.hochschule-trier.de/',
  },
  {
    id: 'portal',
    labelKey: 'profile_portal_label',
    descKey: 'profile_portal_desc',
    icon: 'globe-outline',
    url: 'https://idp.fh-trier.de/idp/profile/SAML2/Redirect/SSO?execution=e5s1&lang=en',
  },
];

export default function ProfileScreen({ navigation }) {
  const t = useTranslation();
  useEffect(() => { trackScreen('ProfileScreen'); }, []);
  const profile = useStore((s) => s.user);
  const courseCount = useStore((s) => s.courses.length);
  const dataReady = useStore((s) => s.dataReady);
  const isHydrating = useStore((s) => s.isHydrating);
  const bootstrapError = useStore((s) => s.bootstrapError);
  const userId = useStore((s) => s.userId);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const [loading, setLoading] = useState(!profile);
  const [refreshing, setRefreshing] = useState(false);

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

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={{ padding: 24, flex: 1 }}>
          <SkeletonLoader lines={4} avatar />
        </View>
      </View>
    );
  }

  if (bootstrapError && !profile) {
    return (
      <View style={styles.screen}>
        <ErrorState
          type={bootstrapError.type}
          onRetry={() => { setLoading(true); loadProfile(true); }}
        />
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
            <Text style={styles.cacheNote}>{t('profile_last_updated', { when: formatLastUpdated(lastSyncAt) })}</Text>
          )}
        </View>

        <View style={styles.card}>
          <InfoRow icon="mail-outline" label={t('profile_email')} value={profile?.email || '—'} />
          <InfoRow icon="person-outline" label={t('profile_username')} value={profile?.username || '—'} />
          <InfoRow icon="book-outline" label={t('profile_enrolled')} value={String(courseCount)} last />
        </View>

        <View style={styles.card}>
          <LinkRow icon="albums-outline" label={t('profile_my_courses')} onPress={() => navigation.navigate('CoursesList')} />
          <LinkRow icon="settings-outline" label={t('profile_settings')} onPress={() => navigation.navigate('Settings')} last />
        </View>

        {/* University portals */}
        <Text style={styles.sectionLabel}>{t('profile_portals')}</Text>
        <View style={styles.card}>
          {PORTAL_LINKS.map((link, i) => (
            <TouchableOpacity
              key={link.id}
              style={[styles.portalRow, i < PORTAL_LINKS.length - 1 && styles.portalRowBorder]}
              onPress={() => Linking.openURL(link.url).catch(() => {})}
              activeOpacity={0.7}
            >
              <View style={styles.portalIconWrap}>
                <Ionicons name={link.icon} size={20} color={PRIMARY} />
              </View>
              <View style={styles.portalText}>
                <Text style={styles.portalLabel}>{t(link.labelKey)}</Text>
                <Text style={styles.portalDesc}>{t(link.descKey)}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={INACTIVE} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  card: { backgroundColor: BG, marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon: { marginRight: 14 },
  rowLabel: { fontSize: 11, color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 15, color: '#1A1A1A', marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  linkLabel: { fontSize: 15, color: '#1A1A1A' },
  portalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  portalRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  portalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EDF6E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalText: { flex: 1 },
  portalLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  portalDesc: { fontSize: 12, color: INACTIVE, marginTop: 2 },
});
