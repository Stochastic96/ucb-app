import {
  normalizeDayName,
  getCurrentDayName,
  isCampusEventRecurring,
  isCampusEventActiveOnDate,
  isCampusEventPast,
  getTodayCampusEvents,
  getUpcomingCampusEvents,
  sortSportsEntries,
  getSportsForDate,
  groupSportsByDay,
  buildCampusEventSections,
  DAY_ORDER,
} from '../../utils/campusContent';

// A fixed Wednesday for deterministic date logic.
const WED = new Date('2024-03-13T08:00:00');

describe('normalizeDayName', () => {
  it('maps German day names to English', () => {
    expect(normalizeDayName('montag')).toBe('Monday');
    expect(normalizeDayName('Donnerstag')).toBe('Thursday');
    expect(normalizeDayName('SONNTAG')).toBe('Sunday');
  });

  it('normalizes English casing', () => {
    expect(normalizeDayName('friday')).toBe('Friday');
    expect(normalizeDayName('TUESDAY')).toBe('Tuesday');
  });

  it('returns null for unknown or empty input', () => {
    expect(normalizeDayName('funday')).toBeNull();
    expect(normalizeDayName('')).toBeNull();
    expect(normalizeDayName(null)).toBeNull();
  });
});

describe('DAY_ORDER', () => {
  it('starts Monday and ends Sunday', () => {
    expect(DAY_ORDER[0]).toBe('Monday');
    expect(DAY_ORDER[6]).toBe('Sunday');
    expect(DAY_ORDER).toHaveLength(7);
  });
});

describe('isCampusEventRecurring', () => {
  it('is true when isRecurring or recurringDay is set', () => {
    expect(isCampusEventRecurring({ isRecurring: true })).toBe(true);
    expect(isCampusEventRecurring({ recurringDay: 'Monday' })).toBe(true);
  });
  it('is false for a one-time dated event', () => {
    expect(isCampusEventRecurring({ date: '2024-03-13' })).toBe(false);
    expect(isCampusEventRecurring(null)).toBe(false);
  });
});

describe('isCampusEventActiveOnDate', () => {
  it('matches a recurring event by weekday name', () => {
    const ev = { isRecurring: true, recurringDay: 'mittwoch' }; // Wednesday
    expect(isCampusEventActiveOnDate(ev, WED)).toBe(true);
    expect(isCampusEventActiveOnDate({ isRecurring: true, recurringDay: 'montag' }, WED)).toBe(false);
  });

  it('matches a one-time event on its exact date', () => {
    expect(isCampusEventActiveOnDate({ date: '2024-03-13' }, WED)).toBe(true);
    expect(isCampusEventActiveOnDate({ date: '2024-03-12' }, WED)).toBe(false);
  });

  it('matches a multi-day event within its inclusive range', () => {
    const ev = { date: '2024-03-12', endDate: '2024-03-14' };
    expect(isCampusEventActiveOnDate(ev, WED)).toBe(true);
  });

  it('returns false for null event or undated one-time event', () => {
    expect(isCampusEventActiveOnDate(null, WED)).toBe(false);
    expect(isCampusEventActiveOnDate({}, WED)).toBe(false);
  });
});

describe('isCampusEventPast', () => {
  it('is true once a one-time event has ended', () => {
    expect(isCampusEventPast({ date: '2024-03-10' }, WED)).toBe(true);
  });
  it('is false for today, future, or recurring events', () => {
    expect(isCampusEventPast({ date: '2024-03-13' }, WED)).toBe(false);
    expect(isCampusEventPast({ date: '2024-03-20' }, WED)).toBe(false);
    expect(isCampusEventPast({ isRecurring: true, recurringDay: 'Monday' }, WED)).toBe(false);
  });
});

describe('getTodayCampusEvents', () => {
  it('returns only active events sorted by time', () => {
    const events = [
      { id: 'late', date: '2024-03-13', time: '18:00' },
      { id: 'past', date: '2024-03-01', time: '10:00' },
      { id: 'early', date: '2024-03-13', time: '09:00' },
      { id: 'recurring', isRecurring: true, recurringDay: 'Wednesday', time: '12:00' },
    ];
    const ids = getTodayCampusEvents(events, WED).map((e) => e.id);
    expect(ids).toEqual(['early', 'recurring', 'late']);
  });

  it('handles empty/nullish input', () => {
    expect(getTodayCampusEvents(null, WED)).toEqual([]);
  });
});

describe('getUpcomingCampusEvents', () => {
  it('returns future one-time events only, sorted and capped', () => {
    const events = [
      { id: 'today', date: '2024-03-13' },
      { id: 'soon', date: '2024-03-15' },
      { id: 'later', date: '2024-03-20' },
      { id: 'latest', date: '2024-03-25' },
      { id: 'past', date: '2024-03-01' },
      { id: 'recurring', isRecurring: true, recurringDay: 'Friday' },
    ];
    const ids = getUpcomingCampusEvents(events, 2, WED).map((e) => e.id);
    expect(ids).toEqual(['soon', 'later']);
  });
});

describe('sortSportsEntries', () => {
  it('sorts by start time, then alphabetically by sport', () => {
    const entries = [
      { startTime: '10:00', sport: 'Yoga' },
      { startTime: '08:00', sport: 'Basketball' },
      { startTime: '10:00', sport: 'Aikido' },
    ];
    expect(sortSportsEntries(entries).map((e) => e.sport)).toEqual(['Basketball', 'Aikido', 'Yoga']);
  });
});

describe('getSportsForDate', () => {
  it('returns entries matching the weekday, sorted by time', () => {
    const entries = [
      { day: 'mittwoch', sport: 'Soccer', startTime: '17:00' },
      { day: 'Wednesday', sport: 'Climbing', startTime: '09:00' },
      { day: 'Monday', sport: 'Tennis', startTime: '08:00' },
    ];
    const result = getSportsForDate(entries, WED);
    expect(result.map((e) => e.sport)).toEqual(['Climbing', 'Soccer']);
  });
});

describe('groupSportsByDay', () => {
  it('groups by day in Mon→Sun order and drops empty days', () => {
    const entries = [
      { day: 'Friday', sport: 'A', startTime: '10:00' },
      { day: 'Monday', sport: 'B', startTime: '10:00' },
    ];
    const grouped = groupSportsByDay(entries);
    expect(grouped.map(([day]) => day)).toEqual(['Monday', 'Friday']);
  });
});

describe('buildCampusEventSections', () => {
  it('groups one-time events by month, chronologically, excluding recurring', () => {
    const events = [
      { id: 'apr', date: '2024-04-02' },
      { id: 'mar1', date: '2024-03-20' },
      { id: 'mar2', date: '2024-03-05' },
      { id: 'rec', isRecurring: true, recurringDay: 'Monday' },
    ];
    const sections = buildCampusEventSections(events);
    expect(sections).toHaveLength(2);
    // March section first, with events sorted ascending within it
    expect(sections[0].data.map((e) => e.id)).toEqual(['mar2', 'mar1']);
    expect(sections[1].data.map((e) => e.id)).toEqual(['apr']);
  });
});
