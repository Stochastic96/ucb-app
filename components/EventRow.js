import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INACTIVE } from '../constants/colors';

function formatTime(isoOrUnix) {
  if (!isoOrUnix) return '';
  const d = new Date(parseInt(isoOrUnix, 10) * 1000 || isoOrUnix);
  return d.toLocaleTimeString('en-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function EventRow({ event }) {
  return (
    <View style={styles.row}>
      <View style={[styles.colorBar, { backgroundColor: event.courseColor }]} />
      <View style={styles.info}>
        <Text style={styles.time}>
          {formatTime(event.start)}{event.end ? ` – ${formatTime(event.end)}` : ''}
        </Text>
        <Text style={styles.title} numberOfLines={1}>{event.courseTitle}</Text>
        {!!event.room && <Text style={styles.room} numberOfLines={1}>Room {event.room}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 8 },
  colorBar: { width: 4, borderRadius: 2, marginRight: 10 },
  info: { flex: 1 },
  time: { fontSize: 11, color: INACTIVE, fontWeight: '600', marginBottom: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  room: { fontSize: 12, color: INACTIVE, marginTop: 1 },
});
