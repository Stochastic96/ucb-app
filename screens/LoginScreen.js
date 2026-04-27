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
import axios from 'axios';
import useStore from '../store/useStore';
import { classifyError } from '../services/api';
import { BASE_URL } from '../constants/config';
import { PRIMARY, DARK, INACTIVE, BG, BORDER } from '../constants/colors';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useStore((s) => s.setUser);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/users/me`, {
        auth: { username: username.trim(), password },
        timeout: 10000,
      });

      await SecureStore.setItemAsync('username', username.trim());
      await SecureStore.setItemAsync('password', password);
      setUser(response.data.data);
    } catch (error) {
      const { type } = classifyError(error);
      let title = 'Login Failed';
      let message;
      if (type === 'AUTH_FAILED') {
        message = 'Wrong username or password. Please check your Stud.IP credentials.';
      } else if (type === 'NO_INTERNET') {
        message = 'No internet connection. Check your WiFi or mobile data.';
      } else if (type === 'SERVER_DOWN') {
        message = 'Stud.IP server is currently unavailable. Try again later.';
      } else {
        message = 'Something went wrong. Please try again.';
      }
      Alert.alert(title, message);
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
          placeholder="Stud.IP Username"
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

        <Text style={styles.hint}>Use your Stud.IP login credentials</Text>
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
    marginTop: 16,
    textAlign: 'center',
    color: INACTIVE,
    fontSize: 13,
  },
});
