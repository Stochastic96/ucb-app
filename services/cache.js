import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

const PREFIX = 'ucb_';

// Keys that must never be wiped by clearAllCache — user-owned personal data and preferences.
// Clearing these without explicit consent would violate DSGVO Art. 5(1)(f) (integrity principle).
const NON_CACHE_KEYS = new Set([
  STORAGE_KEYS.SETTINGS,           // app preferences (notifications, biometric lock)
  STORAGE_KEYS.NEWS_LAST_SEEN,     // reading position — user preference, not Stud.IP cache
  STORAGE_KEYS.DEADLINES,          // user-created deadline data
  STORAGE_KEYS.EXAM_REGISTRATIONS, // user-set exam registration status
  STORAGE_KEYS.EXAM_PLANS,         // user-created exam detail plans
  STORAGE_KEYS.GOING_STATE,        // user RSVP state for events and sports
  STORAGE_KEYS.FACT_STATE,         // daily fact-of-the-day reveal counter + seen list
  STORAGE_KEYS.ANALYTICS_CONSENT,  // user's analytics consent decision — must survive cache clear
]);

export async function setCache(key, data) {
  const entry = JSON.stringify({ data, timestamp: Date.now() });
  await AsyncStorage.setItem(PREFIX + key, entry);
}

export async function getCache(key, ttlMs) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > ttlMs) return null;
    return { data, isCached: true, lastUpdated: new Date(timestamp) };
  } catch {
    return null;
  }
}

export async function clearCache(key) {
  await AsyncStorage.removeItem(PREFIX + key);
}

export async function clearAllCache() {
  const keys = await AsyncStorage.getAllKeys();
  const ucbKeys = keys.filter((k) => k.startsWith(PREFIX) && !NON_CACHE_KEYS.has(k));
  await AsyncStorage.multiRemove(ucbKeys);
}

export async function getCacheTimestamp(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    return new Date(timestamp);
  } catch {
    return null;
  }
}

// Like getCache but ignores TTL — returns stale data when offline
export async function getStaleCacheData(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    return { data, isCached: true, isStale: true, lastUpdated: new Date(timestamp) };
  } catch {
    return null;
  }
}
