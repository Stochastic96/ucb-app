import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG } from '../constants/colors';
import { logout } from '../services/auth';
import useStore from '../store/useStore';

const MAX_FAILS = 3;

export default function BiometricLockScreen({ onUnlock }) {
  const [failCount, setFailCount] = useState(0);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const clearUser = useStore((s) => s.clearUser);

  useEffect(() => {
    // Auto-prompt on mount
    handleAuthenticate();
  }, []);

  const handleAuthenticate = async () => {
    if (failCount >= MAX_FAILS) return;
    setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock UCB Navigator',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        onUnlock();
      } else {
        const next = failCount + 1;
        setFailCount(next);
        if (next >= MAX_FAILS) {
          setError('Too many failed attempts.');
        } else {
          setError(`Authentication failed. ${MAX_FAILS - next} attempt${MAX_FAILS - next === 1 ? '' : 's'} remaining.`);
        }
      }
    } catch {
      setError('Biometric authentication unavailable.');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearUser();
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={48} color={PRIMARY} />
      </View>
      <Text style={styles.title}>UCB Navigator</Text>
      <Text style={styles.subtitle}>Authentication required</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {failCount < MAX_FAILS ? (
        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={handleAuthenticate}
          accessibilityLabel="Unlock with biometrics"
          accessibilityRole="button"
        >
          <Ionicons name="finger-print-outline" size={20} color="#fff" />
          <Text style={styles.unlockBtnText}>Unlock</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.unlockBtn, styles.logoutBtn]}
          onPress={handleLogout}
          disabled={loggingOut}
          accessibilityLabel="Log out and sign in again"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.unlockBtnText}>{loggingOut ? 'Logging out…' : 'Log out & sign in again'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: '#EDF6E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  subtitle: { fontSize: 15, color: INACTIVE, marginBottom: 32 },
  error: { fontSize: 14, color: '#D32F2F', textAlign: 'center', marginBottom: 20 },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutBtn: { backgroundColor: '#D32F2F' },
  unlockBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
