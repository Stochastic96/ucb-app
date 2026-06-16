import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLanguage } from './i18n';
import useStore from '../store/useStore';

// ─────────────────────────────────────────────────────────────────────────
// Anonymous engagement analytics → Supabase `engagement_events`.
//
// Privacy: no personal data. SESSION_ID is a random UUID generated fresh on
// each cold start and is never persisted or linked to any login/device/identity.
// Entirely no-op in __DEV__ so local testing never pollutes production data.
// See screens/legal/DatenschutzScreen.js for the user-facing disclosure.
//
// Table columns written: session_id, event_type, event_name, properties (jsonb),
// platform, app_version. Any extra signal goes INSIDE `properties` so we never
// depend on schema columns that may not exist yet.
// ─────────────────────────────────────────────────────────────────────────

const APP_VERSION = '1.0.0';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000;
const MAX_QUEUE = 200; // hard cap so a long offline streak can't grow unbounded
const QUEUE_KEY = 'ucb_analytics_q'; // pending events persisted across launches

// Random UUID per cold start — never persisted or linked to any user identity
function makeSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const SESSION_ID = makeSessionId();
let _queue = [];
let _flushTimer = null;
let _persistPromise = Promise.resolve();

// Session-scoped engagement counters (reset by startSession)
let _sessionStart = Date.now();
let _eventCount = 0;
const _screensViewed = new Set();
let _ended = false; // guards against duplicate session_end on inactive/background churn

function persistQueue() {
  // Fire-and-forget: keep pending events durable so an app kill before flush
  // doesn't lose engagement data.
  _persistPromise = AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(_queue)).catch(() => {});
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush() {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length);
  try {
    const { error } = await supabase.from('engagement_events').insert(batch);
    if (error) throw error;
    // Success — clear the durable copy.
    AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
  } catch {
    // Re-queue (respecting the cap) so we retry on the next flush, and keep the
    // durable copy. Analytics must never break the app, so swallow the error.
    _queue = [...batch, ..._queue].slice(0, MAX_QUEUE);
    persistQueue();
  }
}

/**
 * Track a named event. No-op in dev so test usage doesn't pollute data.
 * Extra signal is merged into `properties` (jsonb) — never new columns.
 * @param {'session_start'|'session_end'|'screen_view'|'feature_use'|'error'} type
 * @param {string} name
 * @param {object} [properties]
 */
function isAnalyticsEnabled() {
  // __DEV__ guard is checked at call sites too, but being explicit here makes
  // the intent clear: never track in dev, and respect the user's opt-out.
  if (__DEV__) return false;
  const { settings } = useStore.getState();
  // DSGVO compliance: if settings not yet loaded, default to FALSE for safety.
  // Only track if user has explicitly consented (settings.analyticsEnabled === true).
  if (!settings) return false;
  return settings.analyticsEnabled === true;
}

export function trackEvent(type, name, properties = {}) {
  if (!isAnalyticsEnabled()) return;
  _eventCount += 1;
  const enriched = {
    ...properties,
    app_language: getLanguage(),
    ts: new Date().toISOString(),
  };
  _queue.push({
    session_id: SESSION_ID,
    event_type: type,
    event_name: name,
    properties: enriched,
    platform: Platform.OS,
    app_version: APP_VERSION,
  });
  if (_queue.length > MAX_QUEUE) _queue = _queue.slice(-MAX_QUEUE);
  persistQueue();
  if (_queue.length >= BATCH_SIZE) {
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
    flush();
  } else {
    scheduleFlush();
  }
}

/** Shorthand for screen_view events — call from useFocusEffect / on mount. */
export function trackScreen(screenName) {
  _screensViewed.add(screenName);
  trackEvent('screen_view', screenName);
}

/**
 * Begin a session: restore any events that didn't flush before the last app
 * kill, reset the engagement counters, and emit session_start.
 * Call once from App.js on mount.
 */
export async function startSession() {
  _sessionStart = Date.now();
  _eventCount = 0;
  _ended = false;
  _screensViewed.clear();
  if (!isAnalyticsEnabled()) return;
  try {
    const persisted = await AsyncStorage.getItem(QUEUE_KEY);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _queue = [...parsed, ..._queue].slice(0, MAX_QUEUE);
      }
    }
  } catch {
    // ignore — corrupt/empty buffer
  }
  trackEvent('session_start', 'app_open');
  // Attempt to ship anything carried over from a previous run.
  if (_queue.length > 0) flush();
}

/**
 * Close the current engagement session: emit session_end with how long and how
 * actively the user engaged, then flush. Call when the app goes to background.
 */
export function endSession() {
  if (_ended) { if (isAnalyticsEnabled()) flushNow(); return; }
  _ended = true;
  trackEvent('session_end', 'app_close', {
    duration_ms: Date.now() - _sessionStart,
    screens_viewed: _screensViewed.size,
    events: _eventCount,
  });
  // Flush immediately so session_end is sent before the OS suspends background threads
  flushNow();
}

/**
 * Resume engagement tracking when the app returns to the foreground after being
 * backgrounded. Starts a fresh foreground span (same cold-start SESSION_ID).
 */
export function resumeSession() {
  if (!_ended) return; // never backgrounded since last start — nothing to resume
  _ended = false;
  _sessionStart = Date.now();
  if (!isAnalyticsEnabled()) return;
  trackEvent('session_start', 'app_foreground');
}

/** Flush remaining queue immediately — also called from the background handler. */
export function flushNow() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  flush();
}
