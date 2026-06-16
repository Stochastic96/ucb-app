import AsyncStorage from '@react-native-async-storage/async-storage';

// supabase.js calls createClient() at import time (throws without env vars),
// so we replace it with a controllable mock builder.
jest.mock('../../services/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../../services/supabase';
import { getISOWeekString, getCampusEvents } from '../../services/contentService';

// Build a thenable query builder whose terminal .order() resolves to `result`.
function mockQuery(result) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  supabase.from.mockReset();
});

describe('getISOWeekString', () => {
  it('formats the ISO week for a known date', () => {
    // 2024-01-04 falls in ISO week 01 of 2024
    expect(getISOWeekString(new Date('2024-01-04T12:00:00Z'))).toBe('2024-W01');
  });

  it('handles a mid-year week', () => {
    // 2024-03-13 is in ISO week 11
    expect(getISOWeekString(new Date('2024-03-13T12:00:00Z'))).toBe('2024-W11');
  });

  it('pads single-digit week numbers to two digits', () => {
    const wk = getISOWeekString(new Date('2024-01-04T12:00:00Z'));
    expect(wk).toMatch(/-W\d{2}$/);
  });
});

describe('getCampusEvents — success path', () => {
  it('shapes rows from Supabase and reports online', async () => {
    supabase.from.mockReturnValue(
      mockQuery({
        data: [
          {
            id: 'e1',
            title: 'Welcome Party',
            date: '2024-04-01',
            end_date: null,
            category: 'party',
            organizer: 'AStA',
            time: '19:00',
            is_recurring: false,
          },
        ],
        error: null,
      })
    );

    const { data, isOffline } = await getCampusEvents();

    expect(isOffline).toBe(false);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 'e1',
      title: 'Welcome Party',
      endDate: null,
      isRecurring: false,
    });
    // result is cached under the remote cache key
    const cached = await AsyncStorage.getItem('ucb_remote_campus_events');
    expect(cached).toBeTruthy();
  });
});

describe('getCampusEvents — offline fallback', () => {
  it('falls back to bundled JSON on a network error', async () => {
    supabase.from.mockReturnValue(
      mockQuery({ data: null, error: { message: 'Network request failed' } })
    );

    const { data, isOffline } = await getCampusEvents();

    expect(isOffline).toBe(true);
    expect(Array.isArray(data)).toBe(true);
  });

  it('prefers the remote cache over bundled JSON when present', async () => {
    await AsyncStorage.setItem(
      'ucb_remote_campus_events',
      JSON.stringify([{ id: 'cached', title: 'From cache' }])
    );
    supabase.from.mockReturnValue(
      mockQuery({ data: null, error: { message: 'Network request failed' } })
    );

    const { data, isOffline } = await getCampusEvents();

    expect(isOffline).toBe(true);
    expect(data[0]).toMatchObject({ id: 'cached', title: 'From cache' });
  });

  it('propagates non-network (e.g. RLS/server) errors instead of falling back', async () => {
    supabase.from.mockReturnValue(
      mockQuery({ data: null, error: { message: 'permission denied for table' } })
    );

    await expect(getCampusEvents()).rejects.toBeDefined();
  });
});
