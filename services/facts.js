import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import FACTS from '../data/facts.json';

// ─────────────────────────────────────────────────────────────────────────
// Fact of the Day — a small daily ritual.
//
// • Home shows a deterministic "fact of the day" (same for everyone, all day).
// • The Fact screen opens on that fact for free, then "Next" reveals up to
//   MAX_REVEALS new, unseen facts. After that it locks until the next local
//   midnight (calendar-day reset).
//
// State persists under STORAGE_KEYS.FACT_STATE, which is protected in
// cache.js's NON_CACHE_KEYS so a cache clear never resets the user's allowance.
// ─────────────────────────────────────────────────────────────────────────

export const MAX_REVEALS = 3;

export function getAllFacts() {
  return FACTS;
}

/** Returns the active-language copy, falling back to English. */
export function getFactCopy(fact, lang = 'en') {
  if (!fact) return { hook: '', fact: '' };
  return fact[lang] ?? fact.en;
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The "fact of the day" shown on Home and opened first on the Fact screen.
 * A fact flagged `featured: true` is pinned (used to spotlight one fact for now);
 * remove that flag in data/facts.json to restore the deterministic daily rotation.
 */
export function getDailyFact(date = new Date()) {
  const featured = FACTS.find((f) => f.featured);
  if (featured) return featured;
  const index = Number(localDateKey(date).replace(/-/g, '')) % FACTS.length;
  return FACTS[index];
}

const EMPTY_STATE = { date: null, revealCount: 0, seenIds: [] };

/** Load today's state, auto-resetting the allowance when the day rolls over. */
export async function loadFactState(date = new Date()) {
  const today = localDateKey(date);
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FACT_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === today) {
        return {
          date: today,
          revealCount: Number(parsed.revealCount) || 0,
          seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [],
        };
      }
    }
  } catch {
    // ignore corrupt state — fall through to a fresh day
  }
  return { ...EMPTY_STATE, date: today };
}

export async function saveFactState(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FACT_STATE, JSON.stringify(state));
  } catch {
    // non-fatal — the daily limit is a nicety, not critical data
  }
}

/** Mark a fact as seen (e.g. the daily fact) without consuming a reveal. */
export function markSeen(state, factId) {
  if (!factId || state.seenIds.includes(factId)) return state;
  return { ...state, seenIds: [...state.seenIds, factId] };
}

export function revealsLeft(state) {
  // In development (incl. Expo Go) the daily cap is lifted so the feature can be
  // tested without waiting for the midnight reset. Production enforces MAX_REVEALS.
  if (__DEV__) return MAX_REVEALS;
  return Math.max(0, MAX_REVEALS - (state?.revealCount || 0));
}

/**
 * Draw the next unseen fact and consume one reveal.
 * Returns { fact: null, locked: true } once the daily limit is reached.
 */
export function drawNextFact(state) {
  if (revealsLeft(state) <= 0) {
    return { fact: null, state, locked: true };
  }
  const unseen = FACTS.filter((f) => !state.seenIds.includes(f.id));
  const pool = unseen.length > 0 ? unseen : FACTS; // safety: never run dry
  const fact = pool[Math.floor(Math.random() * pool.length)];
  const nextState = {
    ...state,
    revealCount: state.revealCount + 1,
    seenIds: state.seenIds.includes(fact.id)
      ? state.seenIds
      : [...state.seenIds, fact.id],
  };
  return { fact, state: nextState, locked: false };
}

/** Milliseconds until the next local midnight (when the allowance resets). */
export function msUntilReset(date = new Date()) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - date.getTime();
}

/** Human-friendly "5h 12m" / "12m" countdown string. */
export function formatCountdown(ms) {
  if (ms <= 0) return '0m';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
