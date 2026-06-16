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
import { trackEvent } from '../services/analytics';
import * as Haptics from 'expo-haptics';
import { PRIMARY, INACTIVE, BG, BORDER } from '../constants/colors';
import { useTranslation, saveLanguage } from '../services/i18n';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000; // 30 seconds

export default function LoginScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
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
  // Subscribe to language so toggling re-renders the screen (useTranslation is not reactive)
  const language = useStore((s) => s.language);

  const switchLanguage = async (lang) => {
    if (lang === language) return;
    await saveLanguage(lang);
    useStore.getState().setLanguage(lang);
  };

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

      // Cache in memory so bootstrap fetches can authenticate
      setCachedCredentials(trimmedUsername, password);

      // Pre-set user info in store without triggering navigation transition
      useStore.setState({ user, userId: user.id });

      // Run bootstrap. If this fails (e.g. network timeout or API error), it throws
      // and we stay on the LoginScreen instead of showing broken empty tabs.
      await bootstrapSessionData(true);

      // Bootstrap succeeded! Persist credentials securely
      await saveCredentials(trimmedUsername, password);

      setFailCount(0);
      setLockoutEnd(null);
      setOffline(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setUser(user); // Triggers main navigator transition
      didAuthenticate = true;
      trackEvent('feature_use', 'login_success');
    } catch (error) {
      if (didAuthenticate) {
        Alert.alert(t('login_success_title'), t('login_success_msg'));
        return;
      }

      const type = error?.type ?? classifyError(error).type;
      trackEvent('feature_use', 'login_failed', { error_type: type });

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

        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => switchLanguage('en')}
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'en' }}
            accessibilityLabel="English"
          >
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'de' && styles.langBtnActive]}
            onPress={() => switchLanguage('de')}
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'de' }}
            accessibilityLabel="Deutsch"
          >
            <Text style={[styles.langBtnText, language === 'de' && styles.langBtnTextActive]}>DE</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('login_username_placeholder')}
          placeholderTextColor={c.textMuted}
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
          placeholderTextColor={c.textMuted}
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

const makeStyles = (c) => StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: c.bg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  langToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 28,
  },
  langBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  langBtnActive: {
    borderColor: c.primary,
    backgroundColor: c.primary + '15',
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textMuted,
  },
  langBtnTextActive: {
    color: c.primary,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '800',
    color: c.primary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 15,
    color: c.textMuted,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    padding: 15,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 16,
    color: c.text,
  },
  button: {
    backgroundColor: c.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: c.onPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimer: {
    marginTop: 32,
    textAlign: 'center',
    color: c.textFaint,
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
    color: c.primary,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 11,
    color: c.border,
  },
});
