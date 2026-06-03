import useStore from '../store/useStore';
import { fetchProfile } from './profile';
import { trackEvent } from './analytics';
import { fetchCourses } from './courses';
import { fetchAllEvents } from './events';
import { fetchNews } from './news';
import { syncUnreadNewsCount } from './newsState';
import { loadGoingState } from './reminders';
import { toMillis } from '../utils/datetime';

// 30 days back → 180 days ahead: covers the active semester plus next one
const WINDOW_PAST_MS = 30 * 24 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 180 * 24 * 60 * 60 * 1000;

// Deduplication guard — concurrent callers share one in-flight bootstrap
let _inflightBootstrap = null;

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

export function bootstrapSessionData(force = false) {
  if (_inflightBootstrap && !force) return _inflightBootstrap;

  if (_inflightBootstrap && force) {
    // Chain forced refresh after the current run completes — prevents two concurrent
    // _runBootstrap calls from racing to write conflicting state to the store.
    _inflightBootstrap = _inflightBootstrap
      .catch(() => {})
      .then(() => _runBootstrap(true))
      .finally(() => { _inflightBootstrap = null; });
    return _inflightBootstrap;
  }

  _inflightBootstrap = _runBootstrap(force).finally(() => {
    _inflightBootstrap = null;
  });
  return _inflightBootstrap;
}

async function _runBootstrap(force) {
  const store = useStore.getState();
  store.setHydrating(true);
  store.setBootstrapError(null);

  try {
    console.log('[Bootstrap] Starting...');
    const profileResult = await fetchProfile(force);
    console.log('[Bootstrap] Profile loaded');
    const userId = profileResult?.data?.id ?? store.userId;
    if (!userId) {
      throw { type: 'NO_CREDENTIALS', message: 'No logged-in user was found.' };
    }

    const coursesResult = await fetchCourses(userId, force);
    const allCourses = coursesResult?.data ?? [];

    // Fetch events for all enrolled courses — needed to determine which are active
    const allEvents = (await fetchAllEvents(allCourses, force)) ?? [];

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

    // Load persisted RSVP state once per bootstrap so every screen starts with it.
    // Non-critical: a failure here must not abort the bootstrap.
    try {
      const { goingEventIds, goingSportIds } = await loadGoingState();
      store.setGoingEventIds(goingEventIds);
      store.setGoingSportIds(goingSportIds);
    } catch {}

    const lastUpdated = new Date();
    store.setLastSyncAt(lastUpdated);
    store.setDataReady(true);
    store.setOffline(false);
    console.log('[Bootstrap] Complete. Courses:', courses.length, 'Events:', events.length);
    trackEvent('session_start', 'bootstrap_success', { course_count: courses.length });

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
    console.error('[Bootstrap] Failed:', normalized);
    // On a first-load failure, clear any partial state so the UI shows a clean error
    if (!store.dataReady) {
      store.setCourses([]);
      store.setEvents([]);
    }
    trackEvent('error', 'bootstrap_error', { error_type: normalized.type });
    store.setBootstrapError(normalized);
    throw normalized;
  } finally {
    store.setHydrating(false);
  }
}
