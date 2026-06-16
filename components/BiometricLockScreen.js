import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { logout } from '../services/auth';
import useStore from '../store/useStore';
import { useTranslation } from '../services/i18n';

const MAX_FAILS = 3;

export default function BiometricLockScreen({ onUnlock }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [failCount, setFailCount] = useState(0);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const clearUser = useStore((s) => s.clearUser);
  // Ref tracks failCount so handleAuthenticate never captures a stale value
  const failCountRef = useRef(0);
  // Prevents concurrent auth attempts from bypassing the 3-fail limit
  const authenticatingRef = useRef(false);

  const handleAuthenticate = useCallback(async () => {
    if (authenticatingRef.current || failCountRef.current >= MAX_FAILS) return;
    authenticatingRef.current = true;
    setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometric_prompt_message'),
        fallbackLabel: t('biometric_fallback_label'),
        cancelLabel: t('biometric_cancel_label'),
      });
      if (result.success) {
        onUnlock();
      } else {
        const next = failCountRef.current + 1;
        failCountRef.current = next;
        setFailCount(next);
        if (next >= MAX_FAILS) {
          setError(t('biometric_error_too_many'));
        } else {
          setError(t('biometric_error_failed', { attempts: MAX_FAILS - next }));
        }
      }
    } catch {
      setError(t('biometric_error_unavailable'));
    } finally {
      authenticatingRef.current = false;
    }
  }, [onUnlock, t]);

  useEffect(() => {
    handleAuthenticate();
  }, [handleAuthenticate]);

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
      <StatusBar barStyle={c.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={48} color={c.brandIcon} />
      </View>
      <Text style={styles.title}>UCB Navigator</Text>
      <Text style={styles.subtitle}>{t('biometric_locked_subtitle')}</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {failCount < MAX_FAILS ? (
        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={handleAuthenticate}
          accessibilityLabel={t('biometric_unlock_label')}
          accessibilityRole="button"
        >
          <Ionicons name="finger-print-outline" size={20} color={c.onPrimary} />
          <Text style={styles.unlockBtnText}>{t('biometric_unlock_button')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.unlockBtn, styles.logoutBtn]}
          onPress={handleLogout}
          disabled={loggingOut}
          accessibilityLabel={t('biometric_logout_label')}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={c.onPrimary} />
          <Text style={styles.unlockBtnText}>{loggingOut ? t('biometric_logging_out') : t('biometric_logout_button')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: c.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: c.textMuted, marginBottom: 32 },
  error: { fontSize: 14, color: c.error, textAlign: 'center', marginBottom: 20 },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutBtn: { backgroundColor: c.error },
  unlockBtnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },
});
