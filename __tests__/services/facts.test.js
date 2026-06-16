import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {
  getAllFacts,
  getFactCopy,
  getDailyFact,
  loadFactState,
  saveFactState,
  markSeen,
  revealsLeft,
  drawNextFact,
  msUntilReset,
  formatCountdown,
  MAX_REVEALS,
} from '../../services/facts';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getFactCopy', () => {
  it('returns the requested language copy when present', () => {
    const fact = { en: { hook: 'EN hook', fact: 'EN fact' }, de: { hook: 'DE', fact: 'DE' } };
    expect(getFactCopy(fact, 'de')).toEqual({ hook: 'DE', fact: 'DE' });
  });

  it('falls back to English when the language is missing', () => {
    const fact = { en: { hook: 'EN', fact: 'EN' } };
    expect(getFactCopy(fact, 'de')).toEqual({ hook: 'EN', fact: 'EN' });
  });

  it('returns empty copy for a null fact', () => {
    expect(getFactCopy(null)).toEqual({ hook: '', fact: '' });
  });
});

describe('getDailyFact', () => {
  it('returns a valid fact from the dataset', () => {
    const fact = getDailyFact(new Date('2024-03-13'));
    expect(getAllFacts()).toContainEqual(fact);
  });

  it('is deterministic for the same calendar day', () => {
    const a = getDailyFact(new Date('2024-03-13T01:00:00'));
    const b = getDailyFact(new Date('2024-03-13T23:00:00'));
    expect(a.id).toBe(b.id);
  });
});

describe('loadFactState / saveFactState', () => {
  it('round-trips state for the same day', async () => {
    const date = new Date('2024-03-13');
    await saveFactState({ date: '2024-03-13', revealCount: 2, seenIds: ['a', 'b'] });
    const loaded = await loadFactState(date);
    expect(loaded).toEqual({ date: '2024-03-13', revealCount: 2, seenIds: ['a', 'b'] });
  });

  it('resets the allowance when the day has rolled over', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.FACT_STATE,
      JSON.stringify({ date: '2024-03-12', revealCount: 3, seenIds: ['x'] })
    );
    const loaded = await loadFactState(new Date('2024-03-13'));
    expect(loaded).toEqual({ date: '2024-03-13', revealCount: 0, seenIds: [] });
  });

  it('recovers from corrupt persisted JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.FACT_STATE, '{not json');
    const loaded = await loadFactState(new Date('2024-03-13'));
    expect(loaded.revealCount).toBe(0);
    expect(loaded.seenIds).toEqual([]);
  });
});

describe('markSeen', () => {
  it('appends an unseen id', () => {
    const next = markSeen({ seenIds: ['a'] }, 'b');
    expect(next.seenIds).toEqual(['a', 'b']);
  });

  it('is a no-op for an already-seen id or missing id', () => {
    const state = { seenIds: ['a'] };
    expect(markSeen(state, 'a')).toBe(state);
    expect(markSeen(state, null)).toBe(state);
  });
});

describe('revealsLeft / drawNextFact (production allowance)', () => {
  const realDev = global.__DEV__;
  beforeAll(() => {
    global.__DEV__ = false; // production: enforce the daily cap
  });
  afterAll(() => {
    global.__DEV__ = realDev;
  });

  it('counts down from MAX_REVEALS', () => {
    expect(revealsLeft({ revealCount: 0 })).toBe(MAX_REVEALS);
    expect(revealsLeft({ revealCount: 2 })).toBe(MAX_REVEALS - 2);
    expect(revealsLeft({ revealCount: 99 })).toBe(0);
  });

  it('draws an unseen fact and consumes a reveal', () => {
    const { fact, state, locked } = drawNextFact({ revealCount: 0, seenIds: [] });
    expect(locked).toBe(false);
    expect(fact).toBeTruthy();
    expect(state.revealCount).toBe(1);
    expect(state.seenIds).toContain(fact.id);
  });

  it('locks once the allowance is spent', () => {
    const result = drawNextFact({ revealCount: MAX_REVEALS, seenIds: [] });
    expect(result.locked).toBe(true);
    expect(result.fact).toBeNull();
  });
});

describe('msUntilReset / formatCountdown', () => {
  it('returns a positive duration until next local midnight', () => {
    const ms = msUntilReset(new Date('2024-03-13T22:00:00'));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it('formats hours and minutes', () => {
    expect(formatCountdown(0)).toBe('0m');
    expect(formatCountdown(45 * 60 * 1000)).toBe('45m');
    expect(formatCountdown((2 * 60 + 5) * 60 * 1000)).toBe('2h 5m');
  });
});
