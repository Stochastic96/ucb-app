import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ── ISO week helper ─────────────────────────────────────────────
export function getISOWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── Generic offline-first fetch ─────────────────────────────────
async function withFallback(cacheKey, fetcher, localFallback) {
  try {
    const data = await fetcher();
    // Don't cache empty arrays — Supabase table may simply be unpopulated yet
    if (!Array.isArray(data) || data.length > 0) {
      await AsyncStorage.setItem(`ucb_remote_${cacheKey}`, JSON.stringify(data));
      return { data, isOffline: false };
    }
  } catch {}

  const cached = await AsyncStorage.getItem(`ucb_remote_${cacheKey}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed) || parsed.length > 0) {
        return { data: parsed, isOffline: true };
      }
    } catch {}
  }
  try {
    return { data: localFallback(), isOffline: true };
  } catch {
    return { data: [], isOffline: true };
  }
}

// ── MENSA ───────────────────────────────────────────────────────

function shapeMensaRows(dishes, meta) {
  const days = {};
  (dishes ?? []).forEach((row) => {
    if (!days[row.day]) {
      days[row.day] = {
        date: row.date,
        theme: row.theme ?? null,
        themeEmoji: row.theme_emoji ?? null,
        themeColor: row.theme_color ?? null,
        dishes: [],
      };
    }
    days[row.day].dishes.push({
      id: row.id,
      name: row.name,
      nameEn: row.name_en ?? '',
      category: row.category,
      tags: row.tags ?? [],
      prices: {
        student: row.price_student != null ? String(row.price_student) : '0.00',
        employee: row.price_employee != null ? String(row.price_employee) : '0.00',
        guest: row.price_guest != null ? String(row.price_guest) : '0.00',
      },
    });
  });
  return {
    week: dishes?.[0]?.week ?? '',
    updatedAt: meta?.updated_at ?? new Date().toISOString().split('T')[0],
    note: meta?.note ?? '',
    contact: {
      name: meta?.contact_name ?? '',
      phone: meta?.contact_phone ?? '',
      email: meta?.contact_email ?? '',
      instagram: meta?.contact_instagram ?? '',
    },
    days,
  };
}

export async function getMensaWeek(week = null) {
  const targetWeek = week ?? getISOWeekString();
  return withFallback(
    `mensa_${targetWeek}`,
    async () => {
      const [dishRes, metaRes] = await Promise.all([
        supabase.from('mensa_menu').select('*').eq('week', targetWeek).order('sort_order'),
        supabase.from('mensa_meta').select('*').eq('week', targetWeek).maybeSingle(),
      ]);
      if (dishRes.error) throw dishRes.error;
      // metaRes.error is non-fatal — shapeMensaRows guards with optional chaining
      return shapeMensaRows(dishRes.data, metaRes.error ? null : metaRes.data);
    },
    () => require('../data/mensa_week.json')
  );
}

export async function upsertMensaDish(dish) {
  const row = {
    id: dish.id,
    week: dish.week,
    day: dish.day,
    date: dish.date,
    theme: dish.theme ?? null,
    theme_emoji: dish.themeEmoji ?? null,
    theme_color: dish.themeColor ?? null,
    name: dish.name,
    name_en: dish.nameEn ?? null,
    category: dish.category,
    tags: dish.tags ?? [],
    price_student: parseFloat(dish.prices?.student) || 0,
    price_employee: parseFloat(dish.prices?.employee) || 0,
    price_guest: parseFloat(dish.prices?.guest) || 0,
    sort_order: dish.sort_order ?? 0,
  };
  return supabase.from('mensa_menu').upsert(row);
}

export async function deleteMensaDish(id) {
  return supabase.from('mensa_menu').delete().eq('id', id);
}

export async function upsertMensaMeta(meta) {
  return supabase.from('mensa_meta').upsert({
    week: meta.week,
    note: meta.note ?? null,
    contact_name: meta.contact?.name ?? null,
    contact_phone: meta.contact?.phone ?? null,
    contact_email: meta.contact?.email ?? null,
    contact_instagram: meta.contact?.instagram ?? null,
  });
}

// ── CAMPUS EVENTS ───────────────────────────────────────────────

function shapeCampusEvents(rows) {
  return (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    endDate: r.end_date ?? null,
    category: r.category,
    organizer: r.organizer,
    time: r.time ?? null,
    note: r.note ?? null,
    recurringDay: r.recurring_day ?? null,
    isRecurring: r.is_recurring ?? false,
  }));
}

export async function getCampusEvents() {
  return withFallback(
    'campus_events',
    async () => {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return shapeCampusEvents(data);
    },
    () => require('../data/events_campus.json')
  );
}

export async function upsertCampusEvent(event) {
  return supabase.from('campus_events').upsert({
    id: event.id,
    title: event.title,
    date: event.date ?? null,
    end_date: event.endDate ?? null,
    category: event.category ?? null,
    organizer: event.organizer ?? null,
    time: event.time ?? null,
    note: event.note ?? null,
    recurring_day: event.recurringDay ?? null,
    is_recurring: event.isRecurring ?? false,
  });
}

export async function deleteCampusEvent(id) {
  return supabase.from('campus_events').delete().eq('id', id);
}

// ── SPORTS SCHEDULE ─────────────────────────────────────────────

function shapeSports(rows) {
  return (rows ?? []).map((r) => ({
    id: r.id,
    day: r.day,
    startTime: r.start_time,
    endTime: r.end_time,
    sport: r.sport,
    instructor: r.instructor ?? '',
    location: r.location ?? '',
    note: r.note ?? null,
  }));
}

export async function getSportsSchedule() {
  return withFallback(
    'sports_schedule',
    async () => {
      const { data, error } = await supabase
        .from('sports_schedule')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return shapeSports(data);
    },
    () => require('../data/events_sports.json')
  );
}

export async function upsertSportsEntry(entry) {
  return supabase.from('sports_schedule').upsert({
    id: entry.id,
    day: entry.day,
    start_time: entry.startTime,
    end_time: entry.endTime,
    sport: entry.sport,
    instructor: entry.instructor ?? null,
    location: entry.location ?? null,
    note: entry.note ?? null,
    sort_order: entry.sort_order ?? 0,
  });
}

export async function deleteSportsEntry(id) {
  return supabase.from('sports_schedule').delete().eq('id', id);
}

// ── CAMPUS RESOURCES ────────────────────────────────────────────

function shapeResources(rows) {
  return (rows ?? []).map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description ?? '',
    location: r.location ?? '',
    contact: r.contact ?? null,
    phone: r.phone ?? null,
    schedule: r.schedule ?? '',
    recurringDay: r.recurring_day ?? null,
    recurringTime: r.recurring_time ?? null,
    icon: r.icon ?? 'ellipse-outline',
    tags: r.tags ?? [],
    tip: r.tip ?? null,
  }));
}

export async function getCampusResources() {
  return withFallback(
    'campus_resources',
    async () => {
      const { data, error } = await supabase
        .from('campus_resources')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return shapeResources(data);
    },
    () => require('../data/campus_resources.json')
  );
}

export async function upsertResource(resource) {
  return supabase.from('campus_resources').upsert({
    id: resource.id,
    category: resource.category,
    title: resource.title,
    description: resource.description ?? null,
    location: resource.location ?? null,
    contact: resource.contact ?? null,
    phone: resource.phone ?? null,
    schedule: resource.schedule ?? null,
    recurring_day: resource.recurringDay ?? null,
    recurring_time: resource.recurringTime ?? null,
    icon: resource.icon ?? 'ellipse-outline',
    tags: resource.tags ?? [],
    tip: resource.tip ?? null,
    sort_order: resource.sort_order ?? 0,
  });
}

export async function deleteResource(id) {
  return supabase.from('campus_resources').delete().eq('id', id);
}

// ── SEMESTER CALENDAR ───────────────────────────────────────────

function shapeCalendar(semesters, events) {
  const eventsMap = {};
  (events ?? []).forEach((e) => {
    if (!eventsMap[e.semester_id]) eventsMap[e.semester_id] = [];
    eventsMap[e.semester_id].push({
      id: e.id,
      title: e.title,
      titleDe: e.title_de ?? e.title,
      date: e.date,
      endDate: e.end_date ?? null,
      category: e.category,
      description: e.description ?? '',
      icon: e.icon ?? 'calendar-outline',
      important: e.is_important ?? false,
    });
  });

  const semesterList = (semesters ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.short_name ?? s.name,
    color: s.color ?? '#6FAE3E',
    lectureStart: s.lecture_start,
    lectureEnd: s.lecture_end,
    examStart: s.exam_start,
    examEnd: s.exam_end,
    events: eventsMap[s.id] ?? [],
  }));

  const current = semesters?.find((s) => s.is_current)?.id ?? semesters?.[0]?.id ?? '';
  return { current, semesters: semesterList };
}

export async function getSemesterCalendar() {
  return withFallback(
    'semester_calendar',
    async () => {
      const [semRes, evRes] = await Promise.all([
        supabase.from('semester_calendar').select('*').order('lecture_start'),
        supabase.from('calendar_events').select('*').order('date'),
      ]);
      if (semRes.error) throw semRes.error;
      return shapeCalendar(semRes.data, evRes.data);
    },
    () => require('../data/semester_calendar.json')
  );
}

export async function upsertSemester(semester) {
  return supabase.from('semester_calendar').upsert({
    id: semester.id,
    name: semester.name,
    short_name: semester.shortName ?? null,
    color: semester.color ?? null,
    lecture_start: semester.lectureStart ?? null,
    lecture_end: semester.lectureEnd ?? null,
    exam_start: semester.examStart ?? null,
    exam_end: semester.examEnd ?? null,
    is_current: semester.isCurrent ?? false,
  });
}

export async function upsertCalendarEvent(event) {
  return supabase.from('calendar_events').upsert({
    id: event.id,
    semester_id: event.semesterId,
    title: event.title,
    title_de: event.titleDe ?? null,
    date: event.date,
    end_date: event.endDate ?? null,
    category: event.category ?? 'academic',
    description: event.description ?? null,
    icon: event.icon ?? null,
    is_important: event.important ?? false,
    sort_order: event.sort_order ?? 0,
  });
}

export async function deleteCalendarEvent(id) {
  return supabase.from('calendar_events').delete().eq('id', id);
}

// ── GUIDE CONTENT ───────────────────────────────────────────────

export async function getGuideContent(category) {
  const fallbackMap = {
    emergency: () => require('../data/guide_emergency.json'),
    checklist: () => require('../data/guide_checklist.json'),
    glossary: () => require('../data/guide_glossary.json'),
    phrases: () => require('../data/guide_phrases.json'),
    faq: () => require('../data/guide_faq.json'),
    contacts: () => require('../data/guide_contacts.json'),
    offices: () => require('../data/guide_offices.json'),
    work: () => require('../data/guide_work.json'),
    health: () => require('../data/guide_health.json'),
    accommodation: () => require('../data/guide_accommodation.json'),
    bureaucracy: () => require('../data/guide_bureaucracy.json'),
    language: () => require('../data/guide_language.json'),
    rights: () => require('../data/guide_rights.json'),
    buildings: () => require('../data/buildings.json'),
  };

  return withFallback(
    `guide_${category}`,
    async () => {
      const { data, error } = await supabase
        .from('guide_content')
        .select('*')
        .eq('category', category)
        .order('sort_order');
      if (error) throw error;
      return data.map((r) => r.payload);
    },
    fallbackMap[category] ?? (() => [])
  );
}

export async function upsertGuideItem(item) {
  return supabase.from('guide_content').upsert({
    id: item.id,
    category: item.category,
    payload: item.payload,
    sort_order: item.sort_order ?? 0,
  });
}

export async function deleteGuideItem(id) {
  return supabase.from('guide_content').delete().eq('id', id);
}
