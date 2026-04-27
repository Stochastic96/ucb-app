import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData } from './cache';
import { CACHE_TTL } from '../constants/config';
import { COURSE_COLORS } from '../constants/colors';
import useStore from '../store/useStore';
import { toMillis } from '../utils/datetime';

function mapCourse(raw, index) {
  const attrs = raw.attributes ?? {};
  return {
    id: raw.id,
    title: attrs.title ?? attrs['course-number'] ?? 'Untitled Course',
    description: attrs.description ?? '',
    semester: attrs['start-semester'] ?? attrs.semester ?? '',
    lecturerName: attrs['formatted-name'] ?? '',
    courseNumber: attrs['course-number'] ?? '',
    color: COURSE_COLORS[index % COURSE_COLORS.length],
  };
}

function getIncludedCourses(document) {
  const included = document?.included ?? [];
  const map = new Map();
  included
    .filter((item) => item.type === 'courses')
    .forEach((item) => map.set(item.id, item));
  return map;
}

async function fetchStudentCourses(client, userId) {
  const response = await client.get(`/users/${userId}/course-memberships?include=course`);
  const memberships = response.data.data ?? [];
  const includedCourses = getIncludedCourses(response.data);

  return memberships
    .map((membership, index) => {
      const courseId = membership.relationships?.course?.data?.id;
      const course = courseId ? includedCourses.get(courseId) : null;
      return course ? mapCourse(course, index) : null;
    })
    .filter(Boolean);
}

export async function fetchCourses(userId, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCache('courses', CACHE_TTL.COURSES);
    if (cached) return cached;
  }

  try {
    const client = await getApiClient();
    let data = [];

    try {
      data = await fetchStudentCourses(client, userId);
    } catch {
      data = [];
    }

    if (data.length === 0) {
      const response = await client.get(`/users/${userId}/courses`);
      const raw = response.data.data ?? [];
      data = raw.map((item, i) => mapCourse(item, i));
    }

    try { await setCache('courses', data); } catch {}
    useStore.getState().setCourses(data);
    useStore.getState().setOffline(false);
    return { data, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      useStore.getState().setOffline(true);
      const stale = await getStaleCacheData('courses');
      if (stale) {
        useStore.getState().setCourses(stale.data);
        return stale;
      }
    }
    throw classified;
  }
}

export async function fetchCourseDetail(courseId) {
  const cacheKey = `course_${courseId}`;
  const cached = await getCache(cacheKey, CACHE_TTL.COURSES);
  if (cached) return cached;

  try {
    const client = await getApiClient();
    const response = await client.get(`/courses/${courseId}`);
    const data = response.data.data;
    try { await setCache(cacheKey, data); } catch {}
    return { data, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      const stale = await getStaleCacheData(cacheKey);
      if (stale) return stale;
    }
    throw classified;
  }
}

export async function fetchCourseFiles(courseId) {
  const cacheKey = `files_${courseId}`;
  const cached = await getCache(cacheKey, CACHE_TTL.FILES);
  if (cached) return cached;

  try {
    const client = await getApiClient();
    const response = await client.get(`/courses/${courseId}/file-refs`);
    const data = (response.data.data ?? []).map((f) => ({
      id: f.id,
      name: f.attributes?.name ?? 'File',
      size: f.attributes?.size ?? 0,
      mimeType: f.attributes?.['mime-type'] ?? '',
      downloadUrl: f.links?.['content-url'] ?? f.attributes?.['download-url'] ?? null,
    }));
    try { await setCache(cacheKey, data); } catch {}
    return { data, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      const stale = await getStaleCacheData(cacheKey);
      if (stale) return stale;
    }
    throw classified;
  }
}

export async function fetchCourseAnnouncements(courseId) {
  const cacheKey = `announce_${courseId}`;
  const cached = await getCache(cacheKey, CACHE_TTL.ANNOUNCEMENTS);
  if (cached) return cached;

  try {
    const client = await getApiClient();
    const response = await client.get(`/courses/${courseId}/news`);
    const data = (response.data.data ?? [])
      .map((n) => ({
        id: n.id,
        title: n.attributes?.topic ?? n.attributes?.title ?? 'Announcement',
        body: n.attributes?.body ?? '',
        date: n.attributes?.date ?? n.attributes?.mkdate ?? null,
      }))
      .sort((a, b) => (toMillis(b.date) ?? -Infinity) - (toMillis(a.date) ?? -Infinity));
    try { await setCache(cacheKey, data); } catch {}
    return { data, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      const stale = await getStaleCacheData(cacheKey);
      if (stale) return stale;
    }
    throw classified;
  }
}
