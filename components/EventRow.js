import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime24 } from '../utils/datetime';
import { useTranslation } from '../services/i18n';
import { useThemedStyles } from '../theme/ThemeProvider';

export default function EventRow({ event }) {
  const t = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const timeLabel = `${formatTime24(event.start)}${event.end ? ` – ${formatTime24(event.end)}` : ''}`;
  const roomLabel = event.room ? t('home_room', { room: event.room }) : '';
  const a11yLabel = `${event.courseTitle}, ${timeLabel}${roomLabel ? `, ${roomLabel}` : ''}`;
  return (
    <View style={styles.row} accessible accessibilityLabel={a11yLabel}>
      <View style={[styles.colorBar, { backgroundColor: event.courseColor }]} />
      <View style={styles.info}>
        <Text style={styles.time}>{timeLabel}</Text>
        <Text style={styles.title} numberOfLines={1}>{event.courseTitle}</Text>
        {!!event.room && <Text style={styles.room} numberOfLines={1}>{roomLabel}</Text>}
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', marginBottom: c.spacing.sm },
  colorBar: { width: 4, borderRadius: 2, marginRight: 10 },
  info: { flex: 1 },
  time: { ...c.type.micro, color: c.textMuted, marginBottom: 1 },
  title: { ...c.type.bodyStrong, color: c.text },
  room: { ...c.type.caption, color: c.textMuted, marginTop: 1 },
});
