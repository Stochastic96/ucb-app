import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useStore from '../store/useStore';
import { createApiClient, classifyError, setCachedCredentials } from '../services/api';
import { saveCredentials } from '../services/auth';
import { normalizeProfile } from '../services/profile';
import { bootstrapSessionData } from '../services/bootstrap';
import { PRIMARY, INACTIVE, BG, BORDER } from '../constants/colors';
import { useTranslation } from '../services/i18n';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000; // 30 seconds

export default function LoginScreen() {
  const t = useTranslation();
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef(null);
  const setUser = useStore((s) => s.setUser);
  const setOffline = useStore((s) => s.setOffline);

  // Countdown ticker while locked out
  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setSecondsLeft(0);
        clearInterval(tickRef.current);
      } else {
        setSecondsLeft(remaining);
      }
    };
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, [lockoutEnd]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert(t('login_error_missing_title'), t('login_error_missing_msg'));
      return;
    }

    // Enforce lockout
    if (lockoutEnd && Date.now() < lockoutEnd) {
      Alert.alert(t('login_error_too_many_title'), t('login_error_too_many_msg', { seconds: secondsLeft }));
      return;
    }

    setLoading(true);
    let didAuthenticate = false;
    try {
      const trimmedUsername = username.trim();
      const client = createApiClient({ username: trimmedUsername, password });
      const response = await client.get('/users/me');
      const user = normalizeProfile(response.data.data);

      // Persist credentials with device-only SecureStore options + session timestamp
      await saveCredentials(trimmedUsername, password);
      // Cache in memory so concurrent service calls don't race SecureStore
      setCachedCredentials(trimmedUsername, password);

      setFailCount(0);
      setLockoutEnd(null);
      setOffline(false);
      setUser(user);
      didAuthenticate = true;
      await bootstrapSessionData(true);
    } catch (error) {
      if (didAuthenticate) {
        Alert.alert(t('login_success_title'), t('login_success_msg'));
        return;
      }

      const type = error?.type ?? classifyError(error).type;

      // Increment fail counter on auth failures and impose lockout after MAX_ATTEMPTS
      if (type === 'AUTH_FAILED') {
        const next = failCount + 1;
        if (next >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_MS);
          setFailCount(0);
        } else {
          setFailCount(next);
        }
      }

      let message;
      if (type === 'AUTH_FAILED') {
        message = t('login_error_auth_msg');
      } else if (type === 'NO_INTERNET') {
        message = t('login_error_no_internet');
      } else if (type === 'SERVER_DOWN') {
        message = t('login_error_server');
      } else {
        message = t('login_error_unknown');
      }
      Alert.alert(t('login_error_auth_title'), message);
    } finally {
      setLoading(false);
    }
  };

  const isLockedOut = lockoutEnd && Date.now() < lockoutEnd;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>UCB</Text>
          <Text style={styles.subtitle}>Umwelt-Campus Birkenfeld</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('login_username_placeholder')}
          placeholderTextColor={INACTIVE}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          accessibilityLabel={t('login_username_placeholder')}
        />

        <TextInput
          style={styles.input}
          placeholder={t('login_password_placeholder')}
          placeholderTextColor={INACTIVE}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          accessibilityLabel={t('login_password_placeholder')}
        />

        <TouchableOpacity
          style={[styles.button, (loading || isLockedOut) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || !!isLockedOut}
          activeOpacity={0.85}
          accessibilityLabel={t('login_button')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {loading
              ? t('login_button_loading')
              : isLockedOut
              ? t('login_button_retry', { seconds: secondsLeft })
              : t('login_button')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>{t('login_hint')}</Text>

        <Text style={styles.disclaimer}>{t('login_disclaimer')}</Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.legalLink}>{t('settings_privacy_policy')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LegalNotice')}>
            <Text style={styles.legalLink}>{t('settings_legal_notice')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BG,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 15,
    color: INACTIVE,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: INACTIVE,
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimer: {
    marginTop: 32,
    textAlign: 'center',
    color: '#aaa',
    fontSize: 11,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  legalLink: {
    fontSize: 11,
    color: PRIMARY,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 11,
    color: '#ccc',
  },
});
