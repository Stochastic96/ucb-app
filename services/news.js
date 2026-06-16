import { getApiClient, classifyError } from './api';
import { getStaleCacheData, setCache } from './cache';
import { concurrentSettled } from '../utils/concurrentMap';
import useStore from '../store/useStore';
import { syncUnreadNewsCount } from './newsState';
import { toSeconds } from '../utils/datetime';

const NEWS_CACHE_KEY = 'news';

function getSourceKey(item) {
  return item?.sourceKey ?? item?.source ?? 'news';
}

export function getNewsIdentity(item) {
  if (!item) return '';
  return item.uniqueKey ?? `${getSourceKey(item)}:${item.id}`;
}

function sortNewsItems(items) {
  return [...items].sort((a, b) => {
    const da = toSeconds(a.date) ?? -Infinity;
    const db = toSeconds(b.date) ?? -Infinity;
    return db - da;
  });
}

function normalizeNewsItems(items = []) {
  const seen = new Set();

  return sortNewsItems(items).reduce((merged, item) => {
    const normalized = {
      ...item,
      sourceKey: getSourceKey(item),
      uniqueKey: getNewsIdentity(item),
    };

    if (seen.has(normalized.uniqueKey)) return merged;
    seen.add(normalized.uniqueKey);
    merged.push(normalized);
    return merged;
  }, []);
}

function mapNewsItem(raw, source, sourceKey, courseColor) {
  const attrs = raw.attributes ?? {};
  return {
    id: raw.id,
    title: attrs.topic ?? attrs.title ?? 'Announcement',
    body: attrs.body ?? '',
    date: attrs.date ?? attrs.mkdate ?? null,
    source,
    sourceKey,
    uniqueKey: `${sourceKey}:${raw.id}`,
    courseColor: courseColor ?? null,
  };
}

export async function fetchNews(userId, courses = []) {
  const cachedNews = (await getStaleCacheData(NEWS_CACHE_KEY))?.data ?? useStore.getState().news;

  try {
    const client = await getApiClient();

    // Personal + global fire immediately (2 requests, not per-course)
    const [personalResult, globalResult] = await Promise.allSettled([
      client.get(`/users/${userId}/news`),
      client.get('/news'),
    ]);

    // Course news: capped at 3 concurrent requests to avoid hammering Stud.IP
    const courseResults = await concurrentSettled(
      courses,
      (c) => client.get(`/courses/${c.id}/news`),
      3
    );

    const sources = [
      { source: 'Personal', sourceKey: 'personal', courseColor: null, result: personalResult },
      { source: 'UCB Global', sourceKey: 'global', courseColor: null, result: globalResult },
      ...courses.map((c, i) => ({
        source: c.title ?? 'Course',
        sourceKey: `course:${c.id}`,
        courseColor: c.color,
        result: courseResults[i],
      })),
    ];

    const freshItems = [];
    const failedSourceKeys = new Set();
    let firstError = null;

    sources.forEach(({ source, sourceKey, courseColor, result }) => {
      if (result.status === 'fulfilled') {
        const payload = result.value?.data?.data ?? [];
        freshItems.push(
          ...payload.map((item) => mapNewsItem(item, source, sourceKey, courseColor))
        );
        return;
      }
      failedSourceKeys.add(sourceKey);
      if (!firstError) firstError = result.reason;
    });

    const attemptedSourceKeys = new Set([
      'personal',
      'global',
      ...courses.map((c) => `course:${c.id}`),
    ]);

    const cachedFallbackItems = (cachedNews ?? []).filter((item) => {
      const sKey = getSourceKey(item);
      return !attemptedSourceKeys.has(sKey) || failedSourceKeys.has(sKey);
    });

    const hadSuccess = sources.some(({ result }) => result.status === 'fulfilled');
    const merged = normalizeNewsItems([...freshItems, ...cachedFallbackItems]);
    const finalNews = hadSuccess
      ? merged
      : normalizeNewsItems(cachedNews ?? []);

    useStore.getState().setNews(finalNews);
    try { await setCache(NEWS_CACHE_KEY, finalNews); } catch {}
    await syncUnreadNewsCount(finalNews);

    if (hadSuccess) {
      useStore.getState().setOffline(false);
    } else if (firstError) {
      const classified = classifyError(firstError);
      if (classified.type === 'NO_INTERNET') {
        useStore.getState().setOffline(true);
      }
    }

    return finalNews;
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === 'NO_INTERNET') {
      useStore.getState().setOffline(true);
    }

    const fallback = normalizeNewsItems(cachedNews ?? []);
    useStore.getState().setNews(fallback);
    await syncUnreadNewsCount(fallback);
    return fallback;
  }
}
