import * as SecureStore from 'expo-secure-store';
import { getApiClient, classifyError, setCachedCredentials, clearCachedCredentials } from './api';
import { clearAllCache } from './cache';
import { normalizeProfile } from './profile';
import { SESSION_MAX_AGE } from '../constants/config';
import useStore from '../store/useStore';
import useAdminStore from '../store/useAdminStore';

// Credentials are device-only and cannot be restored from iCloud backup to another device
const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveCredentials(username, password) {
  await SecureStore.setItemAsync('username', username, SECURE_OPTS);
  await SecureStore.setItemAsync('password', password, SECURE_OPTS);
  await SecureStore.setItemAsync('ucb_session_created', String(Date.now()), SECURE_OPTS);
}

export async function checkExistingSession() {
  const username = await SecureStore.getItemAsync('username');
  const password = await SecureStore.getItemAsync('password');
  if (!username || !password) return { valid: false, user: null, error: null };

  // Expire sessions older than SESSION_MAX_AGE (7 days) — forces re-login
  const createdAt = await SecureStore.getItemAsync('ucb_session_created');
  if (createdAt && Date.now() - Number(createdAt) > SESSION_MAX_AGE) {
    await _deleteCredentials();
    return { valid: false, user: null, error: { type: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' } };
  }

  // Prime the in-memory cache before any screens try to call getApiClient()
  setCachedCredentials(username, password);

  try {
    const client = await getApiClient();
    const response = await client.get('/users/me');
    return { valid: true, user: normalizeProfile(response.data.data), error: null };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'AUTH_FAILED') {
      await _deleteCredentials();
      clearCachedCredentials();
    }
    return { valid: false, user: null, error: classified };
  }
}

async function _deleteCredentials() {
  await SecureStore.deleteItemAsync('username');
  await SecureStore.deleteItemAsync('password');
  await SecureStore.deleteItemAsync('ucb_session_created');
}

export async function logout() {
  clearCachedCredentials();
  await _deleteCredentials();
  await clearAllCache();
  useStore.getState().clearUser();
  useAdminStore.getState().clearAdminStatus();
}
