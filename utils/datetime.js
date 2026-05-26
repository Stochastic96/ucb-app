export function toMillis(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    const ts = value.getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? (numeric < 1e12 ? numeric * 1000 : numeric) : null;
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function toSeconds(value) {
  const millis = toMillis(value);
  return millis === null ? null : Math.floor(millis / 1000);
}

export function toDate(value) {
  const millis = toMillis(value);
  return millis === null ? null : new Date(millis);
}

export function formatTime24(value, locale = 'en-DE') {
  const date = toDate(value);
  if (!date) return '';

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function isSameCalendarDay(left, right) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (!leftDate || !rightDate) return false;

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

export function formatRelativeFromNow(value) {
  const millis = toMillis(value);
  if (millis === null) return '';

  const diff = Date.now() - millis;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(millis).toLocaleDateString('en-DE', {
    day: 'numeric',
    month: 'short',
  });
}

// ── UI helpers ───────────────────────────────────────────────────

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getTimeUntil(isoOrUnix) {
  const ts = toMillis(isoOrUnix);
  if (ts === null) return '';
  const diff = ts - Date.now();
  if (diff <= 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

// Number of calendar days from today until dateStr (YYYY-MM-DD). Negative = past.
export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

// Format a YYYY-MM-DD string as "DD.MM" (German short date).
// Optionally include an end date to produce "DD.MM–DD2.MM".
export function formatShortDate(dateStr, endDateStr) {
  if (!dateStr) return '';
  const [, m, dd] = dateStr.split('-');
  if (endDateStr) {
    const [, , dd2] = endDateStr.split('-');
    return `${dd}.${m}–${dd2}.${m}`;
  }
  return `${dd}.${m}`;
}

export function getWeekMonday(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}
