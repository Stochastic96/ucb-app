// "Getting started" checklist — quiet post-login discovery of the app's core
// tools (research-backed: visible-progress checklists outperform passive
// feature tours). Purely local state, no tracking of any kind: the record of
// which steps were opened lives only in AsyncStorage on this device.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Step ids are stable — labels/targets live with the UI so copy can evolve.
export const FIRST_STEP_IDS = ['timetable', 'mensa', 'guide', 'map', 'planner'];

const EMPTY = { done: [], dismissed: false };

export function normalizeFirstSteps(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const done = Array.isArray(raw.done)
    ? Array.from(new Set(raw.done.filter((id) => FIRST_STEP_IDS.includes(id))))
    : [];
  return { done, dismissed: raw.dismissed === true };
}

export async function loadFirstSteps() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_STEPS);
    return normalizeFirstSteps(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...EMPTY };
  }
}

async function save(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_STEPS, JSON.stringify(state));
  } catch {}
  return state;
}

export async function markFirstStepDone(id) {
  const state = await loadFirstSteps();
  if (!FIRST_STEP_IDS.includes(id) || state.done.includes(id)) return state;
  return save({ ...state, done: [...state.done, id] });
}

export async function dismissFirstSteps() {
  const state = await loadFirstSteps();
  return save({ ...state, dismissed: true });
}

export function isFirstStepsComplete(state) {
  return state.dismissed || FIRST_STEP_IDS.every((id) => state.done.includes(id));
}
