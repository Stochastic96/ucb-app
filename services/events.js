import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData } from './cache';
import { CACHE_TTL } from '../constants/config';
import useStore from '../store/useStore';

function parseLocation(location) {
  if (!location) return { room: '', building: '', buildingId: null };
  // Format often: "9917-112" (building-room) or "Building 9917, Room 112"
  const match = location.match(/^(\d+)-(.+)$/);
  if (match) {
    return { building: match[1], room: match[2], buildingId: match[1] };
  }
  return { room: location, building: '', buildingId: null };
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

export async function fetchEventsForCourse(course) {
  const cacheKey = `events_${course.id}`;
  const cached = await getCache(cacheKey, CACHE_TTL.EVENTS);
  if (cached) return cached.data;

  try {
    const client = await getApiClient();
    const response = await client.get(`/courses/${course.id}/events`);
    const data = (response.data.data ?? []).map((e) => mapEvent(e, course));
    await setCache(cacheKey, data);
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

export async function fetchAllEvents(courses) {
  if (!courses || courses.length === 0) return [];

  const results = await Promise.all(courses.map((c) => fetchEventsForCourse(c)));
  const flat = results.flat().sort((a, b) => new Date(a.start) - new Date(b.start));
  useStore.getState().setEvents(flat);
  return flat;
}
