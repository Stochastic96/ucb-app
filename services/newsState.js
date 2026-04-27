import AsyncStorage from '@react-native-async-storage/async-storage';
import useStore from '../store/useStore';
import { toMillis } from '../utils/datetime';

const LAST_SEEN_KEY = 'ucb_news_last_seen_at';

export async function getNewsLastSeenAt() {
  const raw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return 0;

  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function countUnreadNews(newsItems, lastSeenAt) {
  return newsItems.filter((item) => {
    const millis = toMillis(item.date);
    return millis !== null && millis > lastSeenAt;
  }).length;
}

export async function syncUnreadNewsCount(newsItems) {
  const lastSeenAt = await getNewsLastSeenAt();
  const count = countUnreadNews(newsItems, lastSeenAt);
  useStore.getState().setUnreadCount(count);
  return { count, lastSeenAt };
}

export async function markNewsSeen(timestamp = Date.now()) {
  await AsyncStorage.setItem(LAST_SEEN_KEY, String(timestamp));
  useStore.getState().markNewsRead(timestamp);
  return timestamp;
}
