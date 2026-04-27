import * as SecureStore from 'expo-secure-store';
import { getApiClient, classifyError } from './api';
import { clearAllCache } from './cache';
import useStore from '../store/useStore';

export async function checkExistingSession() {
  const username = await SecureStore.getItemAsync('username');
  if (!username) return { valid: false, user: null, error: null };

  try {
    const client = await getApiClient();
    const response = await client.get('/users/me');
    return { valid: true, user: response.data.data, error: null };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'AUTH_FAILED') {
      // Stored credentials are no longer valid — clear them
      await SecureStore.deleteItemAsync('username');
      await SecureStore.deleteItemAsync('password');
    }
    return { valid: false, user: null, error: classified };
  }
}

export async function logout() {
  await SecureStore.deleteItemAsync('username');
  await SecureStore.deleteItemAsync('password');
  await clearAllCache();
  useStore.getState().clearUser();
}
