import { getApiClient, classifyError } from './api';
import { setCache, getCache, getStaleCacheData, clearCache } from './cache';
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

export async function fetchCurrentSemester() {
  const cached = await getCache('current_semester', CACHE_TTL.PROFILE);
  if (cached) {
    useStore.getState().setCurrentSemester(cached.data);
    return cached.data;
  }

  try {
    const client = await getApiClient();
    const response = await client.get('/semesters');
    const semesters = response.data.data ?? [];
    const nowSec = Math.floor(Date.now() / 1000);

    const current = semesters.find((s) => {
      const begin = s.attributes?.begin ?? 0;
      const end = s.attributes?.end ?? 0;
      return begin <= nowSec && nowSec <= end;
    });

    if (!current) return null;

    const result = { id: current.id, title: current.attributes?.title ?? '' };

    // Invalidate courses cache on first detection or when semester changes
    const prev = useStore.getState().currentSemester;
    if (!prev || prev.id !== result.id) {
      try { await clearCache('courses'); } catch {}
    }

    try { await setCache('current_semester', result); } catch {}
    useStore.getState().setCurrentSemester(result);
    return result;
  } catch {
    const stale = await getStaleCacheData('current_semester');
    if (stale?.data) {
      useStore.getState().setCurrentSemester(stale.data);
      return stale.data;
    }
    return null;
  }
}

function semesterFilter(courses, currentSemester) {
  if (!currentSemester) return courses;
  return courses.filter(
    (c) => c.semester === currentSemester.title || c.semester === currentSemester.id
  );
}

export async function fetchCourses(userId, forceRefresh = false) {
  const currentSemester = useStore.getState().currentSemester;

  if (!forceRefresh) {
    const cached = await getCache('courses', CACHE_TTL.COURSES);
    if (cached) {
      // Cache stores all courses (unfiltered) — apply semester filter on read
      const filtered = semesterFilter(cached.data, currentSemester);
      useStore.getState().setCourses(filtered);
      return { ...cached, data: filtered };
    }
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

    // Cache ALL courses unfiltered so re-filtering works after semester changes
    try { await setCache('courses', data); } catch {}

    const filtered = semesterFilter(data, currentSemester);
    useStore.getState().setCourses(filtered);
    useStore.getState().setOffline(false);
    return { data: filtered, isCached: false, lastUpdated: new Date() };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      useStore.getState().setOffline(true);
      const stale = await getStaleCacheData('courses');
      if (stale) {
        const filtered = semesterFilter(stale.data, currentSemester);
        useStore.getState().setCourses(filtered);
        return { ...stale, data: filtered };
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
