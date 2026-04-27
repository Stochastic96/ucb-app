import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData } from './cache';
import { CACHE_TTL } from '../constants/config';
import useStore from '../store/useStore';

function mapProfile(raw) {
  const attrs = raw.attributes ?? {};
  const nameParts = (attrs['formatted-name'] ?? '').split(' ');
  return {
    id: raw.id,
    fullName: attrs['formatted-name'] ?? '',
    firstName: nameParts[0] ?? '',
    lastName: nameParts.slice(1).join(' '),
    username: attrs.username ?? '',
    email: attrs['private-email'] ?? attrs.email ?? '',
    avatarUrl: attrs['avatar-normal'] ?? null,
  };
}

export async function fetchProfile(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCache('profile', CACHE_TTL.PROFILE);
    if (cached) return cached;
  }

  try {
    const client = await getApiClient();
    const response = await client.get('/users/me');
    const data = mapProfile(response.data.data);
    await setCache('profile', data);
    useStore.getState().setOffline(false);
    return { data, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      useStore.getState().setOffline(true);
      const stale = await getStaleCacheData('profile');
      if (stale) return stale;
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
