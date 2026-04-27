import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData } from './cache';
import { CACHE_TTL } from '../constants/config';
import useStore from '../store/useStore';

export function normalizeProfile(raw) {
  const attrs = raw.attributes ?? {};
  const firstName = attrs['given-name'] ?? (attrs['formatted-name'] ?? '').split(' ')[0] ?? '';
  const lastName = attrs['family-name'] ?? (attrs['formatted-name'] ?? '').split(' ').slice(1).join(' ');
  const profile = {
    id: raw.id,
    fullName: attrs['formatted-name'] ?? '',
    firstName,
    lastName,
    username: attrs.username ?? '',
    email: attrs.email ?? attrs['private-email'] ?? '',
    avatarUrl: attrs['avatar-normal'] ?? null,
  };
  return profile;
}

export async function fetchProfile(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCache('profile', CACHE_TTL.PROFILE);
    if (cached) {
      useStore.getState().setUser(cached.data);
      return cached;
    }
  }

  try {
    const client = await getApiClient();
    const response = await client.get('/users/me');
    const data = normalizeProfile(response.data.data);
    try { await setCache('profile', data); } catch {}
    useStore.getState().setUser(data);
    useStore.getState().setOffline(false);
    return { data, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      useStore.getState().setOffline(true);
      const stale = await getStaleCacheData('profile');
      if (stale) {
        useStore.getState().setUser(stale.data);
        return stale;
      }
    }
    throw classified;
  }
}

export async function fetchProfileCourseCount(userId) {
  try {
    const client = await getApiClient();
    const response = await client.get(`/users/${userId}/courses`);
    return (response.data.data ?? []).length;
  } catch {
    return null;
  }
}
