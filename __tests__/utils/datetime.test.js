import {
  toMillis,
  toSeconds,
  toDate,
  isSameCalendarDay,
  formatRelativeFromNow,
  getTimeUntil,
  daysUntil,
  formatShortDate,
  getWeekMonday,
} from '../../utils/datetime';

describe('toMillis', () => {
  it('returns null for null/undefined/empty', () => {
    expect(toMillis(null)).toBeNull();
    expect(toMillis(undefined)).toBeNull();
    expect(toMillis('')).toBeNull();
    expect(toMillis('   ')).toBeNull();
  });

  it('passes through millisecond timestamps unchanged', () => {
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it('upconverts unix-seconds (< 1e12) to milliseconds', () => {
    expect(toMillis(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it('parses a numeric string as unix seconds', () => {
    expect(toMillis('1700000000')).toBe(1_700_000_000_000);
  });

  it('parses an ISO string', () => {
    expect(toMillis('2024-01-01T00:00:00.000Z')).toBe(Date.parse('2024-01-01T00:00:00.000Z'));
  });

  it('reads a Date instance', () => {
    const d = new Date('2024-06-01T12:00:00Z');
    expect(toMillis(d)).toBe(d.getTime());
  });

  it('returns null for an invalid Date and unparseable string', () => {
    expect(toMillis(new Date('not-a-date'))).toBeNull();
    expect(toMillis('definitely not a date')).toBeNull();
  });
});

describe('toSeconds / toDate', () => {
  it('toSeconds floors milliseconds to whole seconds', () => {
    expect(toSeconds(1_700_000_000_499)).toBe(1_700_000_000);
  });

  it('toSeconds returns null for invalid input', () => {
    expect(toSeconds(null)).toBeNull();
  });

  it('toDate returns a Date for valid input and null otherwise', () => {
    expect(toDate(1_700_000_000_000)).toBeInstanceOf(Date);
    expect(toDate('')).toBeNull();
  });
});

describe('isSameCalendarDay', () => {
  it('is true for two times on the same local day', () => {
    expect(isSameCalendarDay('2024-03-10T01:00:00', '2024-03-10T23:00:00')).toBe(true);
  });

  it('is false across a day boundary', () => {
    expect(isSameCalendarDay('2024-03-10T23:00:00', '2024-03-11T00:30:00')).toBe(false);
  });

  it('is false when either input is invalid', () => {
    expect(isSameCalendarDay(null, '2024-03-10T00:00:00')).toBe(false);
  });
});

describe('formatRelativeFromNow', () => {
  // Freeze "now" so the relative arithmetic is deterministic (no clock drift
  // between capturing `now` and the Date.now() call inside the function).
  const NOW = new Date('2024-03-13T12:00:00Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it('returns "just now" for the current moment', () => {
    expect(formatRelativeFromNow(NOW)).toBe('just now');
  });

  it('formats minutes, hours and days ago', () => {
    expect(formatRelativeFromNow(NOW - 5 * 60_000)).toBe('5m ago');
    expect(formatRelativeFromNow(NOW - 3 * 3_600_000)).toBe('3h ago');
    expect(formatRelativeFromNow(NOW - 2 * 86_400_000)).toBe('2d ago');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatRelativeFromNow(null)).toBe('');
  });
});

describe('getTimeUntil', () => {
  const NOW = new Date('2024-03-13T12:00:00Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it('returns "now" for past/elapsed times', () => {
    expect(getTimeUntil(NOW - 1000)).toBe('now');
  });

  it('formats minutes-only and hours+minutes', () => {
    expect(getTimeUntil(NOW + 30 * 60_000)).toBe('in 30m');
    expect(getTimeUntil(NOW + (2 * 60 + 15) * 60_000)).toBe('in 2h 15m');
  });

  it('omits minutes when on the hour', () => {
    expect(getTimeUntil(NOW + 3 * 3_600_000)).toBe('in 3h');
  });
});

describe('daysUntil', () => {
  // Build YYYY-MM-DD from LOCAL date parts — toISOString() is UTC and yields
  // yesterday's date when run between local midnight and UTC midnight.
  const localIso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('returns 0 for today and positive for the future', () => {
    const today = new Date();
    expect(daysUntil(localIso(today))).toBe(0);

    const future = new Date(today);
    future.setDate(future.getDate() + 5);
    expect(daysUntil(localIso(future))).toBe(5);
  });
});

describe('formatShortDate', () => {
  it('formats a single YYYY-MM-DD as DD.MM', () => {
    expect(formatShortDate('2024-03-09')).toBe('09.03');
  });

  it('formats a range as DD.MM–DD2.MM', () => {
    expect(formatShortDate('2024-03-09', '2024-03-12')).toBe('09.03–12.03');
  });

  it('returns empty string for falsy input', () => {
    expect(formatShortDate('')).toBe('');
  });
});

describe('getWeekMonday', () => {
  it('returns the Monday of the week for a mid-week date', () => {
    // 2024-03-13 is a Wednesday → Monday is 2024-03-11
    const monday = getWeekMonday(new Date('2024-03-13T10:00:00'));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(11);
    expect(monday.getHours()).toBe(0);
  });

  it('treats Sunday as the end of the week (returns the prior Monday)', () => {
    // 2024-03-17 is a Sunday → Monday is 2024-03-11
    const monday = getWeekMonday(new Date('2024-03-17T10:00:00'));
    expect(monday.getDate()).toBe(11);
  });
});
