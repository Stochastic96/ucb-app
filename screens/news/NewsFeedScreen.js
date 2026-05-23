import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapSessionData } from '../../services/bootstrap';
import { fetchNews } from '../../services/news';
import NewsCard from '../../components/NewsCard';
import SkeletonLoader from '../../components/SkeletonLoader';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG } from '../../constants/colors';
import { markNewsSeen, syncUnreadNewsCount } from '../../services/newsState';
import { getNewsIdentity } from '../../services/news';
import { toMillis } from '../../utils/datetime';
import ErrorState from '../../components/ErrorState';
import SearchBar from '../../components/SearchBar';

function formatFullDate(raw) {
  const ts = toMillis(raw);
  if (ts === null) return '';
  return new Date(ts).toLocaleDateString('en-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function NewsFeedScreen({ navigation, route }) {
  const news = useStore((s) => s.news);
  const userId = useStore((s) => s.userId);
  const courses = useStore((s) => s.courses);
  const dataReady = useStore((s) => s.dataReady);
  const isHydrating = useStore((s) => s.isHydrating);
  const bootstrapError = useStore((s) => s.bootstrapError);

  const [loading, setLoading] = useState(news.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastReadTs, setLastReadTs] = useState(0);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');

  const sources = useMemo(() => {
    const seen = new Set();
    const list = ['All'];
    news.forEach((item) => {
      if (item.source && !seen.has(item.source)) {
        seen.add(item.source);
        list.push(item.source);
      }
    });
    return list;
  }, [news]);

  const filteredNews = useMemo(() => {
    let result = news;
    if (sourceFilter !== 'All') {
      result = result.filter((item) => item.source === sourceFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.body?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [news, query, sourceFilter]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const seenAt = await markNewsSeen();
      setLastReadTs(seenAt);

      if (!dataReady && !isHydrating) {
        await bootstrapSessionData();
      } else {
        const merged = await fetchNews(userId, courses);
        await syncUnreadNewsCount(merged);
      }
    } catch {
      // errors surfaced via bootstrapError in global store
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courses, dataReady, isHydrating, userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const preselectedNewsKey = route.params?.preselectedNewsKey;
    if (!preselectedNewsKey || news.length === 0) return;

    const match = news.find((item) => getNewsIdentity(item) === preselectedNewsKey);
    if (match) {
      setSelected(match);
      navigation.setParams({ preselectedNewsKey: undefined });
      return;
    }

    if (!loading) {
      navigation.setParams({ preselectedNewsKey: undefined });
    }
  }, [loading, navigation, news, route.params?.preselectedNewsKey]);

  useFocusEffect(
    useCallback(() => {
      const seenAt = Date.now();
      markNewsSeen(seenAt).then(() => setLastReadTs(seenAt)).catch(() => {});
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); load(); };

  const isUnread = (item) => {
    const ts = toMillis(item.date);
    return ts !== null && ts > lastReadTs;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 20 }}><SkeletonLoader lines={12} /></View>
      </View>
    );
  }

  if (bootstrapError && news.length === 0) {
    return <ErrorState type={bootstrapError.type} onRetry={onRefresh} />;
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search news…"
        />
      </View>

      {/* Course / source filter chips */}
      {sources.length > 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {sources.map((src) => {
            const active = src === sourceFilter;
            return (
              <TouchableOpacity
                key={src}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSourceFilter(src)}
                accessibilityLabel={`Filter by ${src}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {src}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={filteredNews}
        keyExtractor={(i) => getNewsIdentity(i)}
        renderItem={({ item }) => (
          <NewsCard item={item} unread={isUnread(item)} onPress={() => setSelected(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {query || sourceFilter !== 'All'
                ? 'No news matches your search.'
                : 'No news at the moment.'}
            </Text>
          </View>
        }
      />

      {/* Full news detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          {/* Tap the dark backdrop to dismiss */}
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setSelected(null)} />
          <View style={styles.sheet}>
            {/* Drag handle + close button */}
            <View style={styles.sheetTopBar}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setSelected(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={INACTIVE} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selected && (
                <>
                  <Text style={styles.sheetSource}>{selected.source}</Text>
                  <Text style={styles.sheetDate}>{formatFullDate(selected.date)}</Text>
                  <Text style={styles.sheetTitle}>{selected.title}</Text>
                  <Text style={styles.sheetBody}>{selected.body}</Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  searchWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chipsScroll: { backgroundColor: BG, flexGrow: 0 },
  chipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxWidth: 180,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, color: INACTIVE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: INACTIVE, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '82%',
    paddingBottom: 40,
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: INACTIVE + '40' },
  sheetCloseBtn: { position: 'absolute', right: 0 },
  sheetSource: { fontSize: 12, color: PRIMARY, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sheetDate: { fontSize: 12, color: INACTIVE, marginTop: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  sheetBody: { fontSize: 15, color: '#333', lineHeight: 24 },
});
