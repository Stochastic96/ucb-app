import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData } from './cache';
import { CACHE_TTL } from '../constants/config';
import { COURSE_COLORS } from '../constants/colors';
import useStore from '../store/useStore';

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

export async function fetchCourses(userId, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCache('courses', CACHE_TTL.COURSES);
    if (cached) return cached;
  }

  try {
    const client = await getApiClient();
    const response = await client.get(`/users/${userId}/courses`);
    const raw = response.data.data ?? [];
    const data = raw.map((item, i) => mapCourse(item, i));
    await setCache('courses', data);
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
    await setCache(cacheKey, data);
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
    await setCache(cacheKey, data);
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
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    await setCache(cacheKey, data);
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
