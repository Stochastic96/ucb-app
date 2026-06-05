import useStore from '../store/useStore';
import { fetchProfile } from './profile';
import { trackEvent } from './analytics';
import { fetchCourses } from './courses';
import { fetchAllEvents } from './events';
import { fetchNews } from './news';
import { syncUnreadNewsCount } from './newsState';
import { loadGoingState } from './reminders';
import { drainOfflineQueue } from './offlineQueue';
import { toMillis } from '../utils/datetime';
import * as logger from './logger';

// 30 days back → 180 days ahead: covers the active semester plus next one
const WINDOW_PAST_MS = 30 * 24 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 180 * 24 * 60 * 60 * 1000;

// Deduplication guard — concurrent callers share one in-flight bootstrap
// Protects against concurrent _runBootstrap calls that would race to write the store
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
  // If not forcing, return in-flight promise or start new one
  if (_inflightBootstrap && !force) {
    logger.debug('Bootstrap', 'Returning in-flight bootstrap');
    return _inflightBootstrap;
  }

  // If forcing and already in-flight, queue this as the next run (sequential, not parallel)
  if (_inflightBootstrap && force) {
    logger.debug('Bootstrap', 'Queueing forced refresh after current bootstrap');
    _inflightBootstrap = _inflightBootstrap
      .catch(() => {}) // ignore any previous error
      .then(() => _runBootstrap(true))
      .finally(() => { _inflightBootstrap = null; });
    return _inflightBootstrap;
  }

  // Start new bootstrap — atomically set the guard
  logger.debug('Bootstrap', `Starting new bootstrap (force=${force})`);
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
    logger.info('Bootstrap', 'Starting');
    const profileResult = await fetchProfile(force);
    logger.info('Bootstrap', 'Profile loaded');
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

    // Drain any queued offline operations (notification side-effects).
    // Fire-and-forget — drain failures must not abort bootstrap.
    drainOfflineQueue().catch((err) => {
      logger.warn('Bootstrap', 'Offline queue drain failed', { error: err?.message });
    });

    logger.info('Bootstrap', 'Complete', { course_count: courses.length, event_count: events.length });
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
    logger.error('Bootstrap', 'Failed', normalized);
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
