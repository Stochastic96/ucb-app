import * as SecureStore from 'expo-secure-store';
import { getApiClient, classifyError, setCachedCredentials, clearCachedCredentials } from './api';
import { clearAllCache } from './cache';
import { normalizeProfile } from './profile';
import useStore from '../store/useStore';
import useAdminStore from '../store/useAdminStore';

export async function checkExistingSession() {
  const username = await SecureStore.getItemAsync('username');
  const password = await SecureStore.getItemAsync('password');
  if (!username || !password) return { valid: false, user: null, error: null };

  // Prime the in-memory cache before any screens try to call getApiClient()
  setCachedCredentials(username, password);

  try {
    const client = await getApiClient();
    const response = await client.get('/users/me');
    return { valid: true, user: normalizeProfile(response.data.data), error: null };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'AUTH_FAILED') {
      await SecureStore.deleteItemAsync('username');
      await SecureStore.deleteItemAsync('password');
      clearCachedCredentials();
    }
    return { valid: false, user: null, error: classified };
  }
}

export async function logout() {
  clearCachedCredentials();
  await SecureStore.deleteItemAsync('username');
  await SecureStore.deleteItemAsync('password');
  await clearAllCache();
  useStore.getState().clearUser();
  useAdminStore.getState().clearAdminStatus();
}
