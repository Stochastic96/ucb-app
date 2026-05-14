const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DAY_ORDER = DAY_NAMES.slice(1).concat(DAY_NAMES[0]);

const GERMAN_DAY_MAP = {
  montag: 'Monday',
  dienstag: 'Tuesday',
  mittwoch: 'Wednesday',
  donnerstag: 'Thursday',
  freitag: 'Friday',
  samstag: 'Saturday',
  sonntag: 'Sunday',
};

function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseCalendarDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return startOfDay(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function parseTimeToMinutes(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;

  return Number(match[1]) * 60 + Number(match[2]);
}

function getCampusEventTimestamp(event, referenceDate = new Date()) {
  const baseDate = isCampusEventRecurring(event)
    ? startOfDay(referenceDate)
    : parseCalendarDate(event?.date);

  if (!baseDate) return Infinity;

  return baseDate.getTime() + (parseTimeToMinutes(event?.time) * 60000);
}

function compareCampusEvents(left, right, referenceDate = new Date()) {
  return getCampusEventTimestamp(left, referenceDate) - getCampusEventTimestamp(right, referenceDate);
}

export function normalizeDayName(dayName) {
  if (!dayName) return null;

  const normalized = String(dayName).trim().toLowerCase();
  if (!normalized) return null;

  if (GERMAN_DAY_MAP[normalized]) {
    return GERMAN_DAY_MAP[normalized];
  }

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return DAY_NAMES.includes(capitalized) ? capitalized : null;
}

export function getCurrentDayName(date = new Date()) {
  return DAY_NAMES[new Date(date).getDay()];
}

export function isCampusEventRecurring(event) {
  return Boolean(event?.isRecurring || event?.recurringDay);
}

export function isCampusEventActiveOnDate(event, date = new Date()) {
  if (!event) return false;

  const target = startOfDay(date);

  if (isCampusEventRecurring(event)) {
    return normalizeDayName(event.recurringDay) === getCurrentDayName(target);
  }

  const start = parseCalendarDate(event.date);
  if (!start) return false;

  const end = parseCalendarDate(event.endDate) ?? start;
  return start <= target && target <= end;
}

export function isCampusEventPast(event, date = new Date()) {
  if (!event || isCampusEventRecurring(event)) return false;

  const target = startOfDay(date);
  const end = parseCalendarDate(event.endDate) ?? parseCalendarDate(event.date);
  return end ? end < target : false;
}

export function getTodayCampusEvents(events, date = new Date()) {
  return [...(events ?? [])]
    .filter((event) => isCampusEventActiveOnDate(event, date))
    .sort((left, right) => compareCampusEvents(left, right, date));
}

export function getUpcomingCampusEvents(events, count = 3, date = new Date()) {
  const target = startOfDay(date);

  return [...(events ?? [])]
    .filter((event) => {
      if (!event?.date || isCampusEventRecurring(event)) return false;
      if (isCampusEventActiveOnDate(event, date)) return false;

      const start = parseCalendarDate(event.date);
      return start ? start >= target : false;
    })
    .sort((left, right) => compareCampusEvents(left, right, date))
    .slice(0, count);
}

export function sortSportsEntries(entries) {
  return [...(entries ?? [])].sort((left, right) => {
    const byTime = parseTimeToMinutes(left?.startTime) - parseTimeToMinutes(right?.startTime);
    if (byTime !== 0) return byTime;
    return String(left?.sport ?? '').localeCompare(String(right?.sport ?? ''));
  });
}

export function getSportsForDate(entries, date = new Date()) {
  const today = getCurrentDayName(date);
  return sortSportsEntries(
    (entries ?? []).filter((entry) => normalizeDayName(entry?.day) === today)
  );
}

export function groupSportsByDay(entries) {
  return DAY_ORDER.map((day) => {
    const items = sortSportsEntries(
      (entries ?? []).filter((entry) => normalizeDayName(entry?.day) === day)
    );
    return [day, items];
  }).filter(([, items]) => items.length > 0);
}

export function buildCampusEventSections(events, locale = 'en-DE') {
  const groups = new Map();

  [...(events ?? [])]
    .filter((event) => !isCampusEventRecurring(event) && event?.date)
    .sort((left, right) => compareCampusEvents(left, right))
    .forEach((event) => {
      const date = parseCalendarDate(event.date);
      if (!date) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          title: date.toLocaleDateString(locale, { month: 'long' }),
          sortValue: date.getTime(),
          data: [],
        });
      }

      groups.get(key).data.push(event);
    });

  return Array.from(groups.values())
    .sort((left, right) => left.sortValue - right.sortValue)
    .map(({ title, data }) => ({ title, data }));
}
