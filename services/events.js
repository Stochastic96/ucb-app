import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData } from './cache';
import { CACHE_TTL } from '../constants/config';
import useStore from '../store/useStore';
import { toMillis } from '../utils/datetime';

function parseLocation(location) {
  if (!location) return { room: '', building: '', buildingId: null };

  const normalized = String(location).replace(/\s+/g, ' ').trim();

  const buildingRoomMatch = normalized.match(/\b(\d{4})\s*[-/]\s*([A-Za-z0-9.-]+)\b/);
  if (buildingRoomMatch) {
    return {
      building: buildingRoomMatch[1],
      room: buildingRoomMatch[2],
      buildingId: buildingRoomMatch[1],
    };
  }

  const buildingOnlyMatch = normalized.match(/\b(\d{4})\b/);
  const roomMatch =
    normalized.match(/\b(?:room|raum)\s*[:.-]?\s*([A-Za-z0-9.-]+)\b/i) ??
    normalized.match(/\b([A-Za-z]{0,3}\d{1,3}[A-Za-z]?)\b/);

  if (buildingOnlyMatch) {
    return {
      building: buildingOnlyMatch[1],
      room: roomMatch?.[1] ?? normalized,
      buildingId: buildingOnlyMatch[1],
    };
  }

  return { room: normalized, building: '', buildingId: null };
}

function mapEvent(raw, course) {
  const attrs = raw.attributes ?? {};
  const loc = parseLocation(attrs.location ?? attrs.room ?? '');
  return {
    id: raw.id,
    courseId: course.id,
    courseTitle: course.title,
    courseColor: course.color,
    title: attrs.title ?? attrs.description ?? course.title,
    start: attrs.start ?? attrs['start-time'] ?? null,
    end: attrs.end ?? attrs['end-time'] ?? null,
    room: loc.room,
    building: loc.building,
    buildingId: loc.buildingId,
    professorName: attrs['formatted-name'] ?? course.lecturerName ?? '',
  };
}

async function fetchEventsForCourse(course, client, forceRefresh = false) {
  const cacheKey = `events_${course.id}`;
  if (!forceRefresh) {
    const cached = await getCache(cacheKey, CACHE_TTL.EVENTS);
    if (cached) return cached.data;
  }

  try {
    const response = await client.get(`/courses/${course.id}/events`);
    const data = (response.data.data ?? []).map((e) => mapEvent(e, course));
    try { await setCache(cacheKey, data); } catch {}
    return data;
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      const stale = await getStaleCacheData(cacheKey);
      if (stale) return stale.data;
    }
    return [];
  }
}

export async function fetchAllEvents(courses, forceRefresh = false) {
  if (!courses || courses.length === 0) return [];

  const client = await getApiClient();
  const results = await Promise.all(courses.map((c) => fetchEventsForCourse(c, client, forceRefresh)));
  const flat = results.flat().sort((a, b) => (toMillis(a.start) ?? Infinity) - (toMillis(b.start) ?? Infinity));
  useStore.getState().setEvents(flat);
  return flat;
}
