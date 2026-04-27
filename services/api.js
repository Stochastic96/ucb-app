import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../constants/config';

export async function getApiClient() {
  const username = await SecureStore.getItemAsync('username');
  const password = await SecureStore.getItemAsync('password');
  return axios.create({
    baseURL: BASE_URL,
    auth: { username, password },
    timeout: 10000,
    headers: { Accept: 'application/vnd.api+json' },
  });
}

export function classifyError(err) {
  if (err.response?.status === 401) {
    return { type: 'AUTH_FAILED', message: 'Session expired. Please log in again.' };
  }
  if (err.response?.status >= 500) {
    return { type: 'SERVER_DOWN', message: 'Stud.IP is currently unavailable. Try again later.' };
  }
  if (
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK' ||
    err.message === 'Network Error' ||
    !err.response
  ) {
    return { type: 'NO_INTERNET', message: 'No internet connection. Check your WiFi or mobile data.' };
  }
  return { type: 'UNKNOWN', message: err.message || 'Something went wrong.' };
}
