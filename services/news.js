import { getApiClient, classifyError } from './api';
import useStore from '../store/useStore';

function mapNewsItem(raw, source, courseColor) {
  const attrs = raw.attributes ?? {};
  return {
    id: raw.id,
    title: attrs.topic ?? attrs.title ?? 'Announcement',
    body: attrs.body ?? '',
    date: attrs.date ?? attrs.mkdate ?? null,
    source,
    courseColor: courseColor ?? null,
  };
}

export async function fetchNews(userId, courses = []) {
  try {
    const client = await getApiClient();

    const requests = [
      client.get(`/users/${userId}/news`).catch(() => ({ data: { data: [] } })),
      client.get('/news').catch(() => ({ data: { data: [] } })),
      ...courses.map((c) =>
        client
          .get(`/courses/${c.id}/news`)
          .then((r) => ({ data: r.data, course: c }))
          .catch(() => ({ data: { data: [] }, course: c }))
      ),
    ];

    const results = await Promise.all(requests);

    const personalItems = (results[0].data.data ?? []).map((i) => mapNewsItem(i, 'Personal'));
    const globalItems = (results[1].data.data ?? []).map((i) => mapNewsItem(i, 'UCB Global'));
    const courseItems = results.slice(2).flatMap((r) =>
      (r.data.data ?? []).map((i) => mapNewsItem(i, r.course?.title ?? 'Course', r.course?.color))
    );

    const seen = new Set();
    const merged = [...personalItems, ...globalItems, ...courseItems]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => {
        const da = Number(a.date) || new Date(a.date).getTime() / 1000;
        const db = Number(b.date) || new Date(b.date).getTime() / 1000;
        return db - da;
      });

    useStore.getState().setNews(merged);
    useStore.getState().setOffline(false);
    return merged;
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      useStore.getState().setOffline(true);
    }
    return useStore.getState().news; // return whatever's in the store
  }
}
