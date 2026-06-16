import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { BASE_URL } from '../constants/config';
import { SECURE_KEYS } from '../constants/secureKeys';
import * as logger from './logger';

// In-memory credential cache — avoids concurrent SecureStore races
let _cachedUsername = null;
let _cachedPassword = null;

export function setCachedCredentials(username, password) {
  _cachedUsername = username;
  _cachedPassword = password;
}

export function clearCachedCredentials() {
  _cachedUsername = null;
  _cachedPassword = null;
}

export function createBasicAuthHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

export async function getStoredCredentials() {
  if (_cachedUsername && _cachedPassword) {
    return { username: _cachedUsername, password: _cachedPassword };
  }

  const username = await SecureStore.getItemAsync(SECURE_KEYS.USERNAME);
  const password = await SecureStore.getItemAsync(SECURE_KEYS.PASSWORD);

  if (!username || !password) {
    const err = new Error('No stored Stud.IP credentials');
    err.code = 'NO_CREDENTIALS';
    throw err;
  }

  _cachedUsername = username;
  _cachedPassword = password;
  return { username, password };
}

async function requestJson(path, { username, password, method = 'GET' }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const fullUrl = `${BASE_URL}${path}`;

  try {
    logger.debug('API', `${method} ${path}`);
    const response = await fetch(fullUrl, {
      method,
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: createBasicAuthHeader(username, password),
      },
      signal: controller.signal,
    });
    logger.debug('API', `Response ${response.status} for ${path}`);

    const contentType = response.headers.get('content-type') ?? '';
    let data = null;

    if (contentType.includes('json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { raw: text } : null;
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = { status: response.status, data };
      throw error;
    }

    return { data };
  } catch (error) {
    if (error.name === 'AbortError') {
      error.code = 'ECONNABORTED';
      logger.error('API', `Request timeout for ${path}`);
    } else {
      logger.error('API', `Request failed for ${path}`, error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createApiClient({ username, password }) {
  return {
    get(path) {
      return requestJson(path, { username, password, method: 'GET' });
    },
  };
}

export async function getApiClient() {
  const { username, password } = await getStoredCredentials();
  return createApiClient({ username, password });
}

export function classifyError(err) {
  if (err.code === 'NO_CREDENTIALS') {
    return { type: 'NO_CREDENTIALS', message: 'No stored credentials. Please log in.' };
  }
  if (err.response?.status === 401) {
    return { type: 'AUTH_FAILED', message: 'Session expired. Please log in again.' };
  }
  if (err.response?.status === 403) {
    return { type: 'AUTH_FAILED', message: 'Access denied. Please verify your credentials.' };
  }
  if (err.response?.status === 429) {
    return { type: 'RATE_LIMITED', message: 'Too many requests to Stud.IP. Wait a moment before refreshing.' };
  }
  if (err.response?.status >= 500) {
    return { type: 'SERVER_DOWN', message: 'Stud.IP is currently unavailable. Try again later.' };
  }
  // Only classify as NO_INTERNET when it is clearly a network/fetch failure
  if (
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK' ||
    err.name === 'AbortError' ||
    err.message === 'Network request failed' ||
    err.message === 'Network Error' ||
    (err.message?.toLowerCase().includes('network') && !err.response)
  ) {
    return {
      type: 'NO_INTERNET',
      message: 'Could not reach Stud.IP. Check your internet connection.',
    };
  }
  return { type: 'UNKNOWN', message: err.message || 'Something went wrong.' };
}
