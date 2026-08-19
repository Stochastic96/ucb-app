import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { useTranslation } from '../services/i18n';
import useStore from '../store/useStore';
import { COURSE_COLORS, withAlpha } from '../constants/colors';
import { getProgramLabel } from '../services/campusPrograms';

// Deterministic avatar color from the peer fingerprint (no PII).
function avatarColor(fingerprint) {
  let h = 0;
  for (let i = 0; i < fingerprint.length; i++) h = (h * 31 + fingerprint.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

export default function MatchCard({ peer, onPress, onWave, waved }) {
  const c = useTheme();
  const t = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const language = useStore((s) => s.language);
  const color = avatarColor(peer.fingerprint);
  // A peer-shared real name (received encrypted, signature-checked) becomes the
  // display name; the self-chosen nick stays visible so identity is continuous.
  const displayName = peer.realName || peer.nick;
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const programLabel = peer.programId ? getProgramLabel(peer.programId, language) : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(color, '22') }]}>
        <Text style={[styles.avatarText, { color }]}>{initial}</Text>
        <View style={[styles.dot, { backgroundColor: c.primary, borderColor: c.surface }]} />
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.nick} numberOfLines={1}>{displayName}</Text>
          {!!peer.realName && (
            <Text style={styles.subNick} numberOfLines={1}>{peer.nick}</Text>
          )}
          {peer.verified && <Ionicons name="shield-checkmark" size={13} color={c.primary} />}
          <View style={[styles.originBadge, { backgroundColor: peer.origin === 'INT' ? withAlpha(c.info, '22') : withAlpha(c.primary, '22') }]}>
            <Text style={[styles.originText, { color: peer.origin === 'INT' ? c.info : c.primary }]}>
              {peer.origin === 'INT' ? t('campus_origin_int') : t('campus_origin_de')}
            </Text>
          </View>
        </View>

        {(!!programLabel || peer.semester > 0) && (
          <View style={styles.studyRow}>
            <Ionicons name="school-outline" size={11} color={c.textMuted} />
            <Text style={styles.studyText} numberOfLines={1}>
              {programLabel}
              {!!programLabel && peer.semester > 0 ? ' · ' : ''}
              {peer.semester > 0 ? t('campus_badge_sem', { n: peer.semester }) : ''}
            </Text>
          </View>
        )}

        {!!peer.status && <Text style={styles.status} numberOfLines={1}>{peer.status}</Text>}

        <View style={styles.metaRow}>
          {peer.sameProgram && (
            <View style={styles.tag}>
              <Ionicons name="ribbon-outline" size={11} color={c.primary} />
              <Text style={[styles.tagText, { color: c.primary }]}>{t('campus_badge_same_program')}</Text>
            </View>
          )}
          {!!peer.tandem && (
            <View style={styles.tag}>
              <Ionicons name="swap-horizontal-outline" size={11} color={c.accent} />
              <Text style={[styles.tagText, { color: c.accent }]}>{t('campus_badge_tandem')}</Text>
            </View>
          )}
          {peer.buddyMatch && (
            <View style={styles.tag}>
              <Ionicons name="sparkles-outline" size={11} color={c.info} />
              <Text style={[styles.tagText, { color: c.info }]}>{t('campus_buddy_match')}</Text>
            </View>
          )}
          {peer.sharedCount > 0 && (
            <Text style={styles.shared}>{t('campus_shared_interests', { count: peer.sharedCount })}</Text>
          )}
        </View>
      </View>

      {onWave && (
        <TouchableOpacity
          style={[styles.waveBtn, waved && styles.waveBtnDone]}
          onPress={onWave}
          disabled={waved}
          hitSlop={6}
          activeOpacity={0.8}
        >
          <Ionicons name={waved ? 'hand-left' : 'hand-left-outline'} size={18} color={waved ? c.onPrimary : c.primary} />
        </TouchableOpacity>
      )}
      <Ionicons name="chatbubble-ellipses-outline" size={20} color={c.textMuted} />
    </TouchableOpacity>
  );
}

const makeStyles = (c) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: c.radius.lg,
    gap: 12,
    ...c.shadows.card,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...c.type.title, fontFamily: c.fonts.displaySemiBold },
  dot: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nick: { ...c.type.heading, fontFamily: c.fonts.bodySemiBold, color: c.text, flexShrink: 1 },
  subNick: { ...c.type.caption, color: c.textMuted, flexShrink: 1 },
  originBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  originText: { ...c.type.micro, fontFamily: c.fonts.bodySemiBold },
  studyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  studyText: { ...c.type.caption, color: c.textMuted, flex: 1 },
  status: { ...c.type.bodySm, color: c.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagText: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold },
  shared: { ...c.type.caption, color: c.textSecondary },
  waveBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: c.primary, backgroundColor: withAlpha(c.primary, '14'),
    alignItems: 'center', justifyContent: 'center',
  },
  waveBtnDone: { backgroundColor: c.primary, borderColor: c.primary },
});
