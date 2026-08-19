import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { useTranslation } from '../services/i18n';
import { formatTime24 } from '../utils/datetime';

// One chat message. `mine` right-aligns + tints with the brand color; peer
// messages show the sender nick + a small verified check (signature valid).
//
// Premium affordances:
//  - `grouped`   — consecutive message from the same author within the group
//                  window: tighter spacing, nick suppressed.
//  - `showTime`  — timestamp only on the last message of a group.
//  - `status`    — delivery ladder for own DMs (sending → sent → delivered →
//                  read → or failed); failed bubbles become tappable (onRetry).
const STATUS_ICON = {
  sending: 'time-outline',
  sent: 'checkmark',
  delivered: 'checkmark-done',
  read: 'checkmark-done',
};

export default function MessageBubble({ message, showNick, grouped, showTime = true, onRetry }) {
  const c = useTheme();
  const t = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const mine = message.mine;
  const failed = message.status === 'failed';
  const showMeta = showTime || (mine && message.status);

  const bubble = (
    <View
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        failed && styles.bubbleFailed,
      ]}
    >
      {!mine && showNick && !grouped && (
        <View style={styles.nickRow}>
          <Text style={styles.nick} numberOfLines={1}>{message.nick}</Text>
          {message.verified && (
            <Ionicons name="shield-checkmark" size={11} color={c.primary} />
          )}
        </View>
      )}
      <Text style={[styles.text, mine && !failed && styles.textMine]}>{message.text}</Text>
      {showMeta && (
        <View style={styles.metaRow}>
          {showTime && (
            <Text style={[styles.time, mine && !failed && styles.timeMine]}>{formatTime24(message.ts)}</Text>
          )}
          {mine && !failed && !!STATUS_ICON[message.status] && (
            <Ionicons
              name={STATUS_ICON[message.status]}
              size={13}
              color={message.status === 'read' ? c.info : c.onPrimary}
              style={message.status === 'read' ? null : styles.tickDim}
            />
          )}
          {failed && (
            <>
              <Ionicons name="alert-circle" size={13} color={c.error} />
              <Text style={styles.failedText}>{t('campus_msg_failed')} · {t('campus_retry')}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, grouped ? styles.rowGrouped : null]}>
      {failed && onRetry ? (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>{bubble}</TouchableOpacity>
      ) : (
        bubble
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: { paddingHorizontal: 12, marginTop: 6, flexDirection: 'row' },
  rowGrouped: { marginTop: 2 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: c.radius.lg },
  bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: c.surfaceAlt, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.border },
  bubbleFailed: { backgroundColor: c.warningSurface, borderWidth: 1, borderColor: c.warningBorder },
  nickRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  nick: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, color: c.primary, maxWidth: 160 },
  text: { ...c.type.body, color: c.text },
  textMine: { color: c.onPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 },
  time: { ...c.type.micro, color: c.textMuted },
  timeMine: { color: c.onPrimary, opacity: 0.8 },
  tickDim: { opacity: 0.8 },
  failedText: { ...c.type.micro, fontFamily: c.fonts.bodySemiBold, color: c.error },
});
