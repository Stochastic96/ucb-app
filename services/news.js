import { getApiClient, classifyError } from './api';
import { getStaleCacheData, setCache } from './cache';
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
    const sources = [
      {
        source: 'Personal',
        sourceKey: 'personal',
        request: client.get(`/users/${userId}/news`),
      },
      {
        source: 'UCB Global',
        sourceKey: 'global',
        request: client.get('/news'),
      },
      ...courses.map((c) =>
        ({
          source: c.title ?? 'Course',
          sourceKey: `course:${c.id}`,
          courseColor: c.color,
          request: client.get(`/courses/${c.id}/news`),
        })
      ),
    ];

    const results = await Promise.allSettled(sources.map((entry) => entry.request));
    const freshItems = [];
    const failedSourceKeys = new Set();
    let firstError = null;

    results.forEach((result, index) => {
      const descriptor = sources[index];

      if (result.status === 'fulfilled') {
        const payload = result.value?.data?.data ?? [];
        freshItems.push(
          ...payload.map((item) =>
            mapNewsItem(item, descriptor.source, descriptor.sourceKey, descriptor.courseColor)
          )
        );
        return;
      }

      failedSourceKeys.add(descriptor.sourceKey);
      if (!firstError) firstError = result.reason;
    });

    const cachedFallbackItems = failedSourceKeys.size > 0
      ? (cachedNews ?? []).filter((item) => failedSourceKeys.has(getSourceKey(item)))
      : [];

    const hadSuccess = results.some((result) => result.status === 'fulfilled');
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
