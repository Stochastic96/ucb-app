import { Platform } from 'react-native';
import { supabase } from './supabase';

const APP_VERSION = '1.0.0';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000;

// Random UUID per cold start — never persisted, never linked to any user identity
function makeSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const SESSION_ID = makeSessionId();
let _queue = [];
let _flushTimer = null;

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
    await supabase.from('engagement_events').insert(batch);
  } catch {
    // silent — analytics must never break the app
  }
}

/**
 * Track a named event. No-op in dev so test usage doesn't pollute data.
 * @param {'session_start'|'screen_view'|'feature_use'|'error'} type
 * @param {string} name
 * @param {object} [properties]
 */
export function trackEvent(type, name, properties = {}) {
  if (__DEV__) return;
  _queue.push({
    session_id: SESSION_ID,
    event_type: type,
    event_name: name,
    properties: Object.keys(properties).length > 0 ? properties : null,
    platform: Platform.OS,
    app_version: APP_VERSION,
  });
  if (_queue.length >= BATCH_SIZE) {
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
    flush();
  } else {
    scheduleFlush();
  }
}

/** Shorthand for screen_view events — call from useFocusEffect */
export function trackScreen(screenName) {
  trackEvent('screen_view', screenName);
}

/** Fire session_start and begin flush cycle — call once from App.js on mount */
export function startSession() {
  trackEvent('session_start', 'app_open');
}

/** Flush remaining queue immediately — call from AppState 'background' handler */
export function flushNow() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  flush();
}
