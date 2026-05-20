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
import useStore from '../store/useStore';
import useAdminStore from '../store/useAdminStore';
import { createApiClient, classifyError, setCachedCredentials } from '../services/api';
import { saveCredentials } from '../services/auth';
import { normalizeProfile } from '../services/profile';
import { bootstrapSessionData } from '../services/bootstrap';
import { PRIMARY, INACTIVE, BG, BORDER } from '../constants/colors';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000; // 30 seconds

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef(null);
  const setUser = useStore((s) => s.setUser);
  const setOffline = useStore((s) => s.setOffline);
  const checkAdminStatus = useAdminStore((s) => s.checkAdminStatus);

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
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }

    // Enforce lockout
    if (lockoutEnd && Date.now() < lockoutEnd) {
      Alert.alert('Too many attempts', `Please wait ${secondsLeft}s before trying again.`);
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
      checkAdminStatus(user.username);
      didAuthenticate = true;
      await bootstrapSessionData(true);
    } catch (error) {
      if (didAuthenticate) {
        Alert.alert(
          'Signed In',
          'Your login worked, but some campus data could not be loaded yet. Open the app and pull to refresh in a moment.'
        );
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
        message = 'Wrong username or password. Use the same credentials you use to log into Stud.IP on the web.';
      } else if (type === 'NO_INTERNET') {
        message = 'Cannot reach Stud.IP. Check your internet connection and try again.';
      } else if (type === 'SERVER_DOWN') {
        message = 'Stud.IP server is currently unavailable. Try again later.';
      } else {
        message = 'Something went wrong. Please try again or check your internet connection.';
      }
      Alert.alert('Login Failed', message);
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
          placeholder="Stud.IP username (e.g. prsh4078)"
          placeholderTextColor={INACTIVE}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          accessibilityLabel="Stud.IP username"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={INACTIVE}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          accessibilityLabel="Password"
        />

        <TouchableOpacity
          style={[styles.button, (loading || isLockedOut) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || !!isLockedOut}
          activeOpacity={0.85}
          accessibilityLabel="Log in"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in…' : isLockedOut ? `Try again in ${secondsLeft}s` : 'Login'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Use your Hochschule Trier Stud.IP username and password — the same ones you use at studip.hochschule-trier.de
        </Text>

        <Text style={styles.disclaimer}>
          Unofficial student app · Not affiliated with Hochschule Trier
        </Text>
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
});
