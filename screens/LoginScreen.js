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
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';
import { createApiClient, classifyError, setCachedCredentials } from '../services/api';
import { saveCredentials } from '../services/auth';
import { normalizeProfile } from '../services/profile';
import { bootstrapSessionData } from '../services/bootstrap';
import * as Haptics from 'expo-haptics';
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
  const [showPassword, setShowPassword] = useState(false);
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

        <Text style={styles.inputLabel} nativeID="usernameLabel">{t('login_username_label')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('login_username_placeholder')}
          placeholderTextColor={c.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          accessibilityLabel={t('login_username_label')}
          accessibilityLabelledBy="usernameLabel"
        />

        <Text style={styles.inputLabel} nativeID="passwordLabel">{t('login_password_label')}</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder={t('login_password_placeholder')}
            placeholderTextColor={c.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            accessibilityLabel={t('login_password_label')}
            accessibilityLabelledBy="passwordLabel"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t('login_hide_password') : t('login_show_password')}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={c.textMuted} />
          </TouchableOpacity>
        </View>

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
    ...c.type.label,
    fontSize: 14,
    color: c.textMuted,
  },
  langBtnTextActive: {
    color: c.primary,
  },
  logoText: {
    // one-off display numeral (escape hatch — no preset for hero sizes)
    fontFamily: c.fonts.display,
    fontSize: 56,
    color: c.primary,
    letterSpacing: 4,
  },
  subtitle: {
    ...c.type.body,
    color: c.textMuted,
    marginTop: 4,
  },
  inputLabel: {
    ...c.type.label,
    color: c.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    padding: 15,
    borderRadius: c.radius.md,
    marginBottom: 14,
    fontFamily: c.fonts.body,
    fontSize: 16,
    color: c.text,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 14,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: c.primary,
    padding: c.spacing.md,
    borderRadius: c.radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...c.type.heading,
    fontFamily: c.fonts.bodySemiBold,
    fontSize: 17,
    color: c.onPrimary,
  },
  hint: {
    ...c.type.bodySm,
    marginTop: 20,
    textAlign: 'center',
    color: c.textMuted,
  },
  disclaimer: {
    ...c.type.micro,
    fontFamily: c.fonts.body,
    marginTop: c.spacing.xl,
    textAlign: 'center',
    color: c.textFaint,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  legalLink: {
    ...c.type.micro,
    fontFamily: c.fonts.body,
    color: c.primary,
    textDecorationLine: 'underline',
  },
  legalSep: {
    ...c.type.micro,
    color: c.border,
  },
});
