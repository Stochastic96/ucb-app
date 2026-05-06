import useStore from '../store/useStore';
import useAdminStore from '../store/useAdminStore';
import { fetchProfile } from './profile';
import { fetchCourses } from './courses';
import { fetchAllEvents } from './events';
import { fetchNews } from './news';
import { syncUnreadNewsCount } from './newsState';

export async function bootstrapSessionData(force = false) {
  const store = useStore.getState();
  store.setHydrating(true);
  store.setBootstrapError(null);

  try {
    const profileResult = await fetchProfile(force);
    const userId = profileResult?.data?.id ?? store.userId;
    if (!userId) {
      throw { type: 'NO_CREDENTIALS', message: 'No logged-in user was found.' };
    }

    // Check admin status (non-blocking — fails silently if Supabase is unreachable)
    const username = profileResult?.data?.username ?? '';
    useAdminStore.getState().checkAdminStatus(username).catch(() => {});

    const coursesResult = await fetchCourses(userId, force);
    const courses = coursesResult?.data ?? [];
    const events = await fetchAllEvents(courses, force);
    const news = await fetchNews(userId, courses);
    await syncUnreadNewsCount(news);

    const lastUpdated = new Date();
    store.setLastSyncAt(lastUpdated);
    store.setDataReady(true);
    store.setOffline(false);

    return {
      profile: profileResult?.data ?? null,
      courses,
      events,
      news,
      lastSyncAt: lastUpdated,
    };
  } catch (error) {
    const normalized = {
      type: error?.type ?? 'UNKNOWN',
      message: error?.message ?? 'Unable to load your Stud.IP data.',
    };
    store.setBootstrapError(normalized);
    throw normalized;
  } finally {
    store.setHydrating(false);
  }
}
