import useStore from '../store/useStore';
import { fetchProfile } from './profile';
import { fetchCourses } from './courses';
import { fetchAllEvents } from './events';
import { fetchNews } from './news';
import { syncUnreadNewsCount } from './newsState';
import { toMillis } from '../utils/datetime';

// 30 days back → 180 days ahead: covers the active semester plus next one
const WINDOW_PAST_MS = 30 * 24 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 180 * 24 * 60 * 60 * 1000;

function deriveActiveCourseIds(events) {
  const now = Date.now();
  const ids = new Set();
  events.forEach((e) => {
    const t = toMillis(e.start);
    if (t !== null && t >= now - WINDOW_PAST_MS && t <= now + WINDOW_FUTURE_MS) {
      if (e.courseId) ids.add(e.courseId);
    }
  });
  return ids;
}

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

    const coursesResult = await fetchCourses(userId, force);
    const allCourses = coursesResult?.data ?? [];

    // Fetch events for all enrolled courses — needed to determine which are active
    const allEvents = await fetchAllEvents(allCourses, force);

    // Keep only courses that have events in the current/upcoming semester window
    const activeCourseIds = deriveActiveCourseIds(allEvents);
    const courses = activeCourseIds.size > 0
      ? allCourses.filter((c) => activeCourseIds.has(c.id))
      : allCourses;
    store.setCourses(courses);

    // Trim events to active courses only so the timetable stays clean
    const events = activeCourseIds.size > 0
      ? allEvents.filter((e) => activeCourseIds.has(e.courseId))
      : allEvents;
    store.setEvents(events);

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
