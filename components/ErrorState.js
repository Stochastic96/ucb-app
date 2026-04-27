import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, ERROR, INACTIVE } from '../constants/colors';

const CONFIG = {
  NO_INTERNET: { icon: 'wifi-outline', color: '#F57C00', title: 'No Internet', sub: 'Check your WiFi or mobile data.' },
  SERVER_DOWN: { icon: 'server-outline', color: ERROR, title: 'Server Unavailable', sub: 'Stud.IP is currently down. Try again later.' },
  AUTH_FAILED: { icon: 'lock-closed-outline', color: ERROR, title: 'Session Expired', sub: 'Please log in again.' },
  UNKNOWN: { icon: 'alert-circle-outline', color: INACTIVE, title: 'Something Went Wrong', sub: 'An unexpected error occurred.' },
};

export default function ErrorState({ type = 'UNKNOWN', onRetry }) {
  const { icon, color, title, sub } = CONFIG[type] ?? CONFIG.UNKNOWN;
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={color} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 16, color: '#1A1A1A' },
  sub: { fontSize: 14, color: INACTIVE, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  button: { marginTop: 24, backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
