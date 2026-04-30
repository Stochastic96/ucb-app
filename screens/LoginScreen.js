import React, { useState } from 'react';
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
import * as SecureStore from 'expo-secure-store';
import useStore from '../store/useStore';
import { createApiClient, classifyError, setCachedCredentials } from '../services/api';
import { normalizeProfile } from '../services/profile';
import { bootstrapSessionData } from '../services/bootstrap';
import { PRIMARY, INACTIVE, BG, BORDER } from '../constants/colors';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useStore((s) => s.setUser);
  const setOffline = useStore((s) => s.setOffline);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }

    setLoading(true);
    let didAuthenticate = false;
    try {
      const trimmedUsername = username.trim();
      const client = createApiClient({ username: trimmedUsername, password });
      const response = await client.get('/users/me');
      const user = normalizeProfile(response.data.data);

      // Store credentials
      await SecureStore.setItemAsync('username', trimmedUsername);
      await SecureStore.setItemAsync('password', password);
      // Cache in memory so concurrent service calls don't race SecureStore
      setCachedCredentials(trimmedUsername, password);

      setOffline(false);
      setUser(user);
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
      const status = error.response?.status;

      let message;
      if (type === 'AUTH_FAILED') {
        message = 'Wrong username or password. Use the same credentials you use to log into Stud.IP on the web.';
      } else if (type === 'NO_INTERNET') {
        message = 'Cannot reach Stud.IP. Check your internet connection and try again.';
      } else if (type === 'SERVER_DOWN') {
        message = 'Stud.IP server is currently unavailable. Try again later.';
      } else {
        message = `Something went wrong. (${status ? `HTTP ${status}` : error.message})`;
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

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
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{loading ? 'Logging in…' : 'Login'}</Text>
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
