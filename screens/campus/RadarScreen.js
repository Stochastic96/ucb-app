import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { withAlpha } from '../../constants/colors';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import useStore from '../../store/useStore';
import SearchBar from '../../components/SearchBar';
import MatchCard from '../../components/MatchCard';
import { loadProfile, isProfileComplete } from '../../services/campusProfile';
import { getProgramLabel } from '../../services/campusPrograms';
import { startRadar, stopRadar, setGhostMode, sendWave, isBleAvailable, ROOM_THREAD } from '../../services/campusRadar';
import { formatTime24 } from '../../utils/datetime';

export default function RadarScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);

  const campusProfile = useStore((s) => s.campusProfile);
  const setCampusProfile = useStore((s) => s.setCampusProfile);
  const setBlockedPeers = useStore((s) => s.setBlockedPeers);
  const radarEnabled = useStore((s) => s.radarEnabled);
  const radarGhost = useStore((s) => s.radarGhost);
  const radarPeers = useStore((s) => s.radarPeers);
  const radarUnread = useStore((s) => s.radarUnread);
  const chatThreads = useStore((s) => s.chatThreads);

  const language = useStore((s) => s.language);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [wavedIds, setWavedIds] = useState(() => new Set());
  const [consentVisible, setConsentVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hydrate persisted profile + block list into the store on first mount.
  useEffect(() => {
    (async () => {
      if (!campusProfile) {
        const p = await loadProfile();
        if (p) setCampusProfile(p);
      }
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.CAMPUS_BLOCKED);
        if (raw) setBlockedPeers(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // Stop scanning when leaving the feature (foreground-only presence). The
  // blur cleanup also fires when CampusChat/ProfileEdit are pushed ON TOP of
  // this screen — stopping there would kill the mesh session mid-conversation
  // (peers cleared, sends no-op), so only stop when the user actually navigates
  // out of the Campus Radar flow. Popping the stack (tab reset, back-out)
  // unmounts this screen and lands outside the flow → radar stops as before.
  useFocusEffect(
    useCallback(() => {
      return () => {
        const state = navigation.getState();
        const current = state?.routes?.[state.index]?.name;
        const stayingInFlow = ['CampusChat', 'CampusProfileEdit', 'CampusOnboarding'].includes(current);
        if (!stayingInFlow && useStore.getState().radarEnabled) stopRadar();
      };
    }, [navigation])
  );

  const enableRadar = async () => {
    setBusy(true);
    try {
      await startRadar();
    } catch (e) {
      if (e?.message === 'PROFILE_REQUIRED') {
        navigation.navigate('CampusOnboarding');
      } else if (e?.message === 'RADAR_START_FAILED') {
        // Native transport failed on a real device — surfaced honestly instead
        // of silently showing mock students.
        Alert.alert(t('campus_start_failed_title'), t('campus_start_failed_body'));
      }
      // PERMISSIONS_DENIED: the switch simply stays off — the OS dialog was
      // just declined, so don't nag with another prompt here.
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (next) => {
    if (!next) { await stopRadar(); return; }
    if (!isProfileComplete(campusProfile)) {
      navigation.navigate('CampusOnboarding');
      return;
    }
    const consented = await AsyncStorage.getItem(STORAGE_KEYS.CAMPUS_CONSENT);
    if (!consented) { setConsentVisible(true); return; }
    enableRadar();
  };

  const acceptConsent = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.CAMPUS_CONSENT, String(Date.now()));
    setConsentVisible(false);
    enableRadar();
  };

  // Filter chips only appear for facets the user's own profile can match on.
  const filters = useMemo(() => {
    const f = [{ key: 'all', label: t('campus_filter_all') }];
    if (campusProfile?.programId) f.push({ key: 'program', label: t('campus_filter_program') });
    if (campusProfile?.semester) f.push({ key: 'semester', label: t('campus_filter_semester') });
    if (campusProfile?.speak?.length || campusProfile?.learn?.length) {
      f.push({ key: 'tandem', label: t('campus_filter_tandem') });
    }
    return f;
  }, [campusProfile, t]);

  useEffect(() => {
    if (!filters.some((f) => f.key === filter)) setFilter('all');
  }, [filters, filter]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return radarPeers
      .filter((p) => {
        if (filter === 'program' && !p.sameProgram) return false;
        if (filter === 'semester' && !p.sameSemester) return false;
        if (filter === 'tandem' && !p.tandem) return false;
        if (!q) return true;
        const programLabel = p.programId ? getProgramLabel(p.programId, language).toLowerCase() : '';
        return (
          p.nick.toLowerCase().includes(q) ||
          (p.status ?? '').toLowerCase().includes(q) ||
          (p.realName ?? '').toLowerCase().includes(q) ||
          programLabel.includes(q)
        );
      })
      .sort((a, b) => b.score - a.score || b.lastSeen - a.lastSeen);
  }, [radarPeers, query, filter, language]);

  const openThread = (threadId, title) => navigation.navigate('CampusChat', { threadId, title });

  // Active conversations — reachable even after a peer ages out of the Nearby
  // list (3 min linger), so a chat can never become stranded mid-conversation.
  const threads = useMemo(
    () =>
      Object.entries(chatThreads)
        .filter(([id, msgs]) => id !== ROOM_THREAD && msgs.length > 0)
        .map(([id, msgs]) => {
          const last = msgs[msgs.length - 1];
          const threadPeer = radarPeers.find((p) => p.peerId === id);
          return {
            id,
            title: threadPeer?.realName ?? threadPeer?.nick ?? last.nick ?? '?',
            last,
            unread: radarUnread[id] ?? 0,
            connected: !!threadPeer?.connected,
          };
        })
        .sort((a, b) => b.last.ts - a.last.ts),
    [chatThreads, radarPeers, radarUnread]
  );

  const doWave = (peer) => {
    setWavedIds((prev) => new Set(prev).add(peer.peerId));
    sendWave(peer.peerId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const onWave = (peer) => {
    if (radarGhost) {
      Alert.alert(t('campus_wave_ghost_title'), t('campus_wave_ghost_body'), [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('campus_go_visible'),
          onPress: async () => {
            await setGhostMode(false);
            doWave(peer);
          },
        },
      ]);
      return;
    }
    doWave(peer);
  };

  // ── no profile yet ──
  if (!isProfileComplete(campusProfile)) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-circle-outline" size={64} color={c.primary} />
        <Text style={styles.emptyTitle}>{t('campus_setup_title')}</Text>
        <Text style={styles.emptySub}>{t('campus_setup_sub')}</Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('CampusOnboarding')} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{t('campus_setup_cta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* profile + toggle header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerNick} numberOfLines={1}>{campusProfile.username}</Text>
          <Text style={styles.headerStatus} numberOfLines={1}>
            {!radarEnabled
              ? t('campus_visible_off')
              : radarGhost
              ? t('campus_ghost_badge')
              : t('campus_visible_on')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CampusProfileEdit')} hitSlop={10} style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color={c.primary} />
        </TouchableOpacity>
        <Switch value={radarEnabled} onValueChange={onToggle} />
      </View>

      {/* Ghost / Visible mode — how discoverable you are while Radar is on */}
      {radarEnabled && (
        <View style={styles.modeWrap}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, radarGhost && styles.modeBtnActive]}
              onPress={() => setGhostMode(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-off-outline" size={17} color={radarGhost ? c.onPrimary : c.textSecondary} />
              <Text style={[styles.modeText, radarGhost && styles.modeTextActive]}>{t('campus_mode_ghost')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, !radarGhost && styles.modeBtnActive]}
              onPress={() => setGhostMode(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="radio-outline" size={17} color={!radarGhost ? c.onPrimary : c.textSecondary} />
              <Text style={[styles.modeText, !radarGhost && styles.modeTextActive]}>{t('campus_mode_visible')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeHint}>{radarGhost ? t('campus_ghost_hint') : t('campus_visible_hint')}</Text>
        </View>
      )}

      {!isBleAvailable() && (
        <View style={styles.mockBanner}>
          <Ionicons name="flask-outline" size={15} color={c.onWarning} />
          <Text style={styles.mockText}>{t('campus_mock_notice')}</Text>
        </View>
      )}

      {/* Campus Room */}
      <TouchableOpacity style={styles.roomCard} onPress={() => openThread(ROOM_THREAD, t('campus_room'))} activeOpacity={0.85}>
        <View style={[styles.roomIcon, { backgroundColor: withAlpha(c.primary, '22') }]}>
          <Ionicons name="megaphone-outline" size={22} color={c.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.roomTitle}>{t('campus_room')}</Text>
          <Text style={styles.roomSub}>{t('campus_room_sub')}</Text>
        </View>
        {radarUnread[ROOM_THREAD] > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{radarUnread[ROOM_THREAD]}</Text></View>
        )}
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </TouchableOpacity>

      {threads.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('campus_chats')}</Text>
          {threads.map(({ id, title, last, unread, connected }) => (
            <TouchableOpacity key={id} style={styles.threadRow} onPress={() => openThread(id, title)} activeOpacity={0.8}>
              <View style={[styles.threadIcon, !connected && styles.threadIconOff]}>
                <Ionicons name="chatbubble-outline" size={17} color={connected ? c.primary : c.textMuted} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.threadTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.threadPreview} numberOfLines={1}>
                  {last.mine ? `${t('campus_you')}: ` : ''}{last.text}
                </Text>
              </View>
              <View style={styles.threadMeta}>
                <Text style={styles.threadTime}>{formatTime24(last.ts)}</Text>
                {unread > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('campus_search_ph')} style={styles.search} />

      {filters.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Text style={styles.sectionLabel}>{t('campus_nearby')}</Text>

      {matches.length > 0 ? (
        matches.map((peer) => (
          <MatchCard
            key={peer.peerId}
            peer={peer}
            onPress={() => openThread(peer.peerId, peer.nick)}
            onWave={() => onWave(peer)}
            waved={wavedIds.has(peer.peerId)}
          />
        ))
      ) : (
        <View style={styles.scanBox}>
          {radarEnabled ? (
            <>
              <ActivityIndicator color={c.primary} />
              <Text style={styles.scanText}>{t('campus_scanning')}</Text>
            </>
          ) : (
            <Text style={styles.scanText}>{t('campus_toggle_hint')}</Text>
          )}
        </View>
      )}

      {busy && <ActivityIndicator style={{ marginTop: 12 }} color={c.primary} />}

      {/* one-time consent sheet */}
      <Modal visible={consentVisible} transparent animationType="fade" onRequestClose={() => setConsentVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Ionicons name="shield-checkmark-outline" size={34} color={c.primary} />
            <Text style={styles.sheetTitle}>{t('campus_consent_title')}</Text>
            <Text style={styles.sheetBody}>{t('campus_consent_body')}</Text>
            <Text style={styles.sheetSafety}>{t('campus_consent_safety')}</Text>
            <TouchableOpacity style={styles.sheetPrimary} onPress={acceptConsent} activeOpacity={0.85}>
              <Text style={styles.sheetPrimaryText}>{t('campus_consent_accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConsentVisible(false)} hitSlop={8}>
              <Text style={styles.sheetCancel}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 32 },
  center: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { ...c.type.title, color: c.text, marginTop: 8, textAlign: 'center' },
  emptySub: { ...c.type.body, color: c.textMuted, textAlign: 'center' },
  cta: { marginTop: 12, backgroundColor: c.primary, paddingHorizontal: 24, height: 48, borderRadius: c.radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { ...c.type.bodyStrong, color: c.onPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerInfo: { flex: 1 },
  headerNick: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text },
  headerStatus: { ...c.type.caption, color: c.textMuted, marginTop: 1 },
  editBtn: { padding: 4 },
  modeWrap: { paddingHorizontal: 12, paddingTop: 12 },
  modeRow: {
    flexDirection: 'row', gap: 6, backgroundColor: c.surfaceAlt,
    borderRadius: c.radius.lg, padding: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: c.radius.md ?? 10,
  },
  modeBtnActive: { backgroundColor: c.primary },
  modeText: { ...c.type.bodySm, fontFamily: c.fonts.bodySemiBold, color: c.textSecondary },
  modeTextActive: { color: c.onPrimary },
  modeHint: { ...c.type.caption, color: c.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  mockBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.warningSurface, paddingHorizontal: 14, paddingVertical: 8,
  },
  mockText: { ...c.type.caption, color: c.onWarning, flex: 1 },
  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, marginHorizontal: 12, marginTop: 14, padding: 14,
    borderRadius: c.radius.lg, ...c.shadows.card,
  },
  roomIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  roomTitle: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text },
  roomSub: { ...c.type.bodySm, color: c.textMuted, marginTop: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { ...c.type.micro, color: '#fff', fontFamily: c.fonts.bodySemiBold },
  threadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: c.radius.lg, ...c.shadows.card,
  },
  threadIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: withAlpha(c.primary, '16'),
    alignItems: 'center', justifyContent: 'center',
  },
  threadIconOff: { backgroundColor: c.surfaceAlt },
  threadTitle: { ...c.type.bodyStrong, color: c.text },
  threadPreview: { ...c.type.caption, color: c.textMuted, marginTop: 1 },
  threadMeta: { alignItems: 'flex-end', gap: 4 },
  threadTime: { ...c.type.micro, color: c.textMuted },
  search: { marginHorizontal: 12, marginTop: 14 },
  filterRow: { marginTop: 10, flexGrow: 0 },
  filterContent: { paddingHorizontal: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  filterText: { ...c.type.bodySm, color: c.textSecondary },
  filterTextActive: { color: c.onPrimary, fontFamily: c.fonts.bodySemiBold },
  sectionLabel: { ...c.type.label, fontFamily: c.fonts.bodySemiBold, color: c.textSecondary, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  scanBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  scanText: { ...c.type.bodySm, color: c.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: c.surface, borderRadius: c.radius.xl ?? 20, padding: 24, alignItems: 'center', gap: 10 },
  sheetTitle: { ...c.type.title, color: c.text, textAlign: 'center' },
  sheetBody: { ...c.type.bodySm, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  sheetSafety: {
    ...c.type.caption, color: c.onWarning, textAlign: 'center', lineHeight: 18,
    backgroundColor: c.warningSurface, borderRadius: c.radius.md ?? 10, padding: 10,
  },
  sheetPrimary: { backgroundColor: c.primary, height: 48, borderRadius: c.radius.lg, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  sheetPrimaryText: { ...c.type.bodyStrong, color: c.onPrimary },
  sheetCancel: { ...c.type.bodySm, color: c.textMuted, marginTop: 4 },
});
