import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../services/i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { withAlpha } from '../../constants/colors';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import useStore from '../../store/useStore';
import MessageBubble from '../../components/MessageBubble';
import {
  sendRoomMessage,
  sendPrivateMessage,
  sendWave,
  shareMyName,
  setGhostMode,
  startRadar,
  notifyThreadViewed,
  registerBlockedPeerId,
  ROOM_THREAD,
} from '../../services/campusRadar';
import { openExternalUrl } from '../../services/linking';

// Messages from the same author inside this window collapse into one visual
// group (nick shown once, timestamp on the last message only).
const GROUP_WINDOW_MS = 4 * 60 * 1000;

function sameAuthor(a, b) {
  if (!a || !b || a.kind || b.kind) return false;
  if (a.mine !== b.mine) return false;
  return (a.fingerprint ?? a.nick) === (b.fingerprint ?? b.nick);
}

export default function ChatThreadScreen({ navigation, route }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const threadId = route.params?.threadId ?? ROOM_THREAD;
  const isRoom = threadId === ROOM_THREAD;

  const messages = useStore((s) => s.chatThreads[threadId] ?? []);
  const peer = useStore((s) => s.radarPeers.find((p) => p.peerId === threadId));
  const inRangeCount = useStore((s) => s.radarPeers.filter((p) => p.connected).length);
  const campusProfile = useStore((s) => s.campusProfile);
  const radarEnabled = useStore((s) => s.radarEnabled);
  const radarGhost = useStore((s) => s.radarGhost);
  const setActiveThreadId = useStore((s) => s.setActiveThreadId);
  const markThreadRead = useStore((s) => s.markThreadRead);
  const clearThread = useStore((s) => s.clearThread);
  const blockPeer = useStore((s) => s.blockPeer);
  const removeChatMessage = useStore((s) => s.removeChatMessage);

  const [text, setText] = useState('');
  const [justWaved, setJustWaved] = useState(false);

  // Newest-first copy for the inverted list (keeps the view pinned to the
  // bottom through keyboard opens and new arrivals without scroll juggling).
  const listData = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    setActiveThreadId(threadId);
    markThreadRead(threadId);
    notifyThreadViewed(threadId); // read receipts for everything already here
    return () => setActiveThreadId(null);
  }, [threadId]);

  useEffect(() => {
    markThreadRead(threadId);
    notifyThreadViewed(threadId); // service dedupes — safe to call per arrival
  }, [messages.length]);

  const persistBlocked = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CAMPUS_BLOCKED, JSON.stringify(useStore.getState().blockedPeers));
    } catch {}
  };

  const doBlock = () => {
    if (!peer) return;
    registerBlockedPeerId(peer.peerId); // drop their ROOM messages too, this session
    blockPeer(peer.fingerprint);
    persistBlocked();
    clearThread(threadId);
    navigation.goBack();
  };

  const doReport = () => {
    Alert.alert(t('campus_report_title'), t('campus_report_body'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('campus_report_confirm'),
        style: 'destructive',
        onPress: () => {
          doBlock();
          // Serverless app → no central moderation. For serious incidents we
          // route the user to the people who can actually act (campus / police),
          // rather than pretending an in-app report is handled somewhere.
          Alert.alert(t('campus_report_done'), t('campus_report_authorities'), [
            { text: t('campus_report_call_police'), onPress: () => openExternalUrl('tel:110') },
            { text: t('common_ok'), style: 'cancel' },
          ]);
        },
      },
    ]);
  };

  const doHandover = () => {
    Alert.alert(t('campus_handover_title'), t('campus_handover_body'), [
      { text: 'WhatsApp', onPress: () => openExternalUrl('https://wa.me/') },
      { text: 'Instagram', onPress: () => openExternalUrl('instagram://app') },
      { text: t('common_cancel'), style: 'cancel' },
    ]);
  };

  // Share my real name into THIS chat only (signed, over the encrypted DM
  // channel — never broadcast). Ghost users must go Visible first, like sending.
  const doShareName = () => {
    if (radarGhost) return;
    const name = campusProfile?.realName?.trim();
    if (!name) {
      Alert.alert(t('campus_share_name_missing_title'), t('campus_share_name_missing_body'), [
        { text: t('common_cancel'), style: 'cancel' },
        { text: t('campus_share_name_add'), onPress: () => navigation.navigate('CampusProfileEdit') },
      ]);
      return;
    }
    Alert.alert(t('campus_share_name_confirm_title'), t('campus_share_name_confirm_body', { name }), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('campus_share_name'), onPress: () => shareMyName(threadId) },
    ]);
  };

  const openMenu = () => {
    const options = [{ text: t('campus_clear_chat'), onPress: () => clearThread(threadId) }];
    if (!isRoom && peer) {
      options.unshift({ text: t('campus_handover_cta'), onPress: doHandover });
      if (!radarGhost && !peer.myNameShared) {
        options.unshift({ text: t('campus_share_name'), onPress: doShareName });
      }
      options.unshift({ text: t('campus_report'), style: 'destructive', onPress: doReport });
      options.unshift({ text: t('campus_block'), style: 'destructive', onPress: doBlock });
    }
    options.push({ text: t('common_cancel'), style: 'cancel' });
    Alert.alert(peer?.realName ?? peer?.nick ?? t('campus_room'), null, options);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      // A signature-checked shared name upgrades the header, nick kept alongside.
      ...(peer?.realName ? { title: `${peer.realName} · ${peer.nick}` } : {}),
      headerRight: () => (
        <TouchableOpacity onPress={openMenu} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color={c.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, peer, threadId, c.primary, radarGhost]);

  const onSend = async () => {
    if (radarGhost || !radarEnabled) return; // read-only until Visible + running
    const clean = text.trim();
    if (!clean) return;
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isRoom) await sendRoomMessage(clean);
    else await sendPrivateMessage(threadId, clean);
  };

  const doWaveInChat = () => {
    if (radarGhost || !radarEnabled || justWaved) return;
    setJustWaved(true);
    setTimeout(() => setJustWaved(false), 3000); // sender-side debounce
    sendWave(threadId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const onRetry = (msg) => {
    Alert.alert(t('campus_retry_title'), t('campus_retry_body'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('campus_retry'),
        onPress: () => {
          removeChatMessage(threadId, msg.id);
          sendPrivateMessage(threadId, msg.text);
        },
      },
    ]);
  };

  const onTurnOn = async () => {
    try {
      await startRadar();
    } catch (e) {
      if (e?.message === 'RADAR_START_FAILED') {
        Alert.alert(t('campus_start_failed_title'), t('campus_start_failed_body'));
      }
    }
  };

  // Centered system chip for non-text events (wave / name share).
  const renderMessage = ({ item, index }) => {
    if (item.kind === 'wave') {
      return (
        <View style={styles.sysRow}>
          <View style={styles.sysChip}>
            <Text style={styles.sysEmoji}>👋</Text>
            <Text style={styles.sysText}>
              {item.mine ? t('campus_wave_sent') : t('campus_waved_you', { nick: item.nick })}
            </Text>
          </View>
        </View>
      );
    }
    if (item.kind === 'name') {
      return (
        <View style={styles.sysRow}>
          <View style={styles.sysChip}>
            <Ionicons name="person-circle-outline" size={14} color={c.primary} />
            <Text style={styles.sysText}>
              {item.mine
                ? t('campus_name_shared_mine', { name: item.text })
                : t('campus_name_shared_theirs', { nick: item.nick, name: item.text })}
            </Text>
          </View>
        </View>
      );
    }
    // listData is newest-first: chronological neighbors are index+1 (previous)
    // and index-1 (next).
    const prev = listData[index + 1];
    const next = listData[index - 1];
    const grouped = sameAuthor(item, prev) && item.ts - prev.ts < GROUP_WINDOW_MS;
    const showTime = !(sameAuthor(next, item) && next.ts - item.ts < GROUP_WINDOW_MS);
    return (
      <MessageBubble
        message={item}
        showNick={isRoom}
        grouped={grouped}
        showTime={showTime}
        onRetry={item.status === 'failed' ? () => onRetry(item) : undefined}
      />
    );
  };

  const emptyState = (
    <View style={styles.empty}>
      {!isRoom && peer && radarEnabled && !radarGhost ? (
        <>
          <TouchableOpacity
            style={[styles.bigWave, justWaved && styles.bigWaveDone]}
            onPress={doWaveInChat}
            disabled={justWaved}
            activeOpacity={0.8}
          >
            <Ionicons name={justWaved ? 'hand-left' : 'hand-left-outline'} size={30} color={justWaved ? c.onPrimary : c.primary} />
          </TouchableOpacity>
          <Text style={styles.emptyTitle}>{t('campus_say_hi', { nick: peer.realName ?? peer.nick })}</Text>
          <Text style={styles.emptyText}>{t('campus_dm_empty')}</Text>
        </>
      ) : (
        <>
          <Ionicons name="chatbubbles-outline" size={40} color={c.textMuted} />
          <Text style={styles.emptyText}>{isRoom ? t('campus_room_empty') : t('campus_dm_empty')}</Text>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Ambient context strip: reach for the room, trust state for DMs. */}
      {isRoom ? (
        <View style={styles.contextBar}>
          <Ionicons name="people-outline" size={13} color={c.textSecondary} />
          <Text style={styles.contextText}>{t('campus_room_reach', { count: inRangeCount })}</Text>
        </View>
      ) : peer ? (
        <View style={styles.contextBar}>
          <Ionicons name="lock-closed" size={12} color={c.primary} />
          <Text style={styles.contextText}>{t('campus_e2e')}</Text>
          <Text style={styles.contextSep}>·</Text>
          <Ionicons
            name={peer.proven ? 'shield-checkmark' : 'shield-outline'}
            size={12}
            color={peer.proven ? c.primary : c.textSecondary}
          />
          <Text style={styles.contextText}>
            {peer.proven ? t('campus_identity_proven') : t('campus_sig_verified')}
          </Text>
          <Text style={styles.contextSep}>·</Text>
          <View style={[styles.presenceDot, { backgroundColor: peer.connected ? c.primary : c.textMuted }]} />
          <Text style={styles.contextText}>
            {peer.connected ? t('campus_in_range') : t('campus_out_of_range')}
          </Text>
        </View>
      ) : null}

      {!isRoom && (!peer || !peer.connected) && (
        <View style={styles.rangeWarn}>
          <Ionicons name="cloud-offline-outline" size={13} color={c.onWarning} />
          <Text style={styles.rangeWarnText}>{t('campus_out_of_range_note')}</Text>
        </View>
      )}

      <FlatList
        data={listData}
        inverted={messages.length > 0}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={emptyState}
      />

      {!radarEnabled ? (
        <View style={styles.stateBar}>
          <Ionicons name="radio-outline" size={16} color={c.textSecondary} />
          <Text style={styles.stateBarText}>{t('campus_radar_off_note')}</Text>
          <TouchableOpacity style={styles.stateBarBtn} onPress={onTurnOn} activeOpacity={0.85}>
            <Text style={styles.stateBarBtnText}>{t('campus_turn_on')}</Text>
          </TouchableOpacity>
        </View>
      ) : radarGhost ? (
        <TouchableOpacity style={styles.stateBar} onPress={() => setGhostMode(false)} activeOpacity={0.85}>
          <Ionicons name="eye-off-outline" size={16} color={c.textSecondary} />
          <Text style={styles.stateBarText}>{t('campus_ghost_locked_body')}</Text>
          <View style={styles.stateBarBtn}>
            <Text style={styles.stateBarBtnText}>{t('campus_go_visible')}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.composer}>
          {!isRoom && (
            <TouchableOpacity
              style={[styles.waveBtn, justWaved && styles.waveBtnDone]}
              onPress={doWaveInChat}
              disabled={justWaved}
              hitSlop={6}
            >
              <Ionicons
                name={justWaved ? 'hand-left' : 'hand-left-outline'}
                size={19}
                color={justWaved ? c.onPrimary : c.primary}
              />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('campus_message_ph')}
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color={c.onPrimary} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.bg },
  contextBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: c.surfaceAlt, paddingVertical: 7, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  contextText: { ...c.type.caption, color: c.textSecondary },
  contextSep: { ...c.type.caption, color: c.textMuted },
  presenceDot: { width: 7, height: 7, borderRadius: 4 },
  rangeWarn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: c.warningSurface, paddingVertical: 7, paddingHorizontal: 14,
  },
  rangeWarnText: { ...c.type.caption, color: c.onWarning, flexShrink: 1 },
  list: { paddingVertical: 12, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text, textAlign: 'center' },
  emptyText: { ...c.type.bodySm, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  bigWave: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1.5, borderColor: c.primary, backgroundColor: withAlpha(c.primary, '14'),
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  bigWaveDone: { backgroundColor: c.primary },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface,
  },
  input: {
    flex: 1, maxHeight: 110, minHeight: 42,
    backgroundColor: c.surfaceAlt, borderRadius: c.radius.lg, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    ...c.type.body, color: c.text,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  waveBtn: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  waveBtnDone: { backgroundColor: c.primary, borderColor: c.primary },
  stateBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface,
  },
  stateBarText: { ...c.type.bodySm, color: c.textSecondary, flex: 1 },
  stateBarBtn: { backgroundColor: c.primary, paddingHorizontal: 14, height: 34, borderRadius: c.radius.lg, alignItems: 'center', justifyContent: 'center' },
  stateBarBtnText: { ...c.type.label, fontFamily: c.fonts.bodySemiBold, color: c.onPrimary },
  sysRow: { alignItems: 'center', marginVertical: 6, paddingHorizontal: 24 },
  sysChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '100%',
  },
  sysEmoji: { ...c.type.bodySm, color: c.text },
  sysText: { ...c.type.caption, color: c.textSecondary, flexShrink: 1 },
});
