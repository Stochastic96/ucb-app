import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl, Modal, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNews } from '../../services/news';
import NewsCard from '../../components/NewsCard';
import SkeletonLoader from '../../components/SkeletonLoader';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, SURFACE, BG } from '../../constants/colors';

function formatFullDate(raw) {
  if (!raw) return '';
  const ts = typeof raw === 'number' ? raw * 1000 : new Date(raw).getTime();
  return new Date(ts).toLocaleDateString('en-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function NewsFeedScreen() {
  const news = useStore((s) => s.news);
  const userId = useStore((s) => s.userId);
  const courses = useStore((s) => s.courses);
  const markNewsRead = useStore((s) => s.markNewsRead);
  const setUnreadCount = useStore((s) => s.setUnreadCount);

  const [loading, setLoading] = useState(news.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastReadTs, setLastReadTs] = useState(0);
  const [selected, setSelected] = useState(null);

  const loadLastRead = async () => {
    const raw = await AsyncStorage.getItem('ucb_news_last_read');
    return raw ? parseInt(raw, 10) : 0;
  };

  const load = useCallback(async () => {
    if (!userId) return;
    const ts = await loadLastRead();
    setLastReadTs(ts);
    await fetchNews(userId, courses);
    setLoading(false);
    setRefreshing(false);
  }, [userId, courses]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const markRead = async () => {
      const now = Date.now();
      await AsyncStorage.setItem('ucb_news_last_read', String(now));
      markNewsRead();
    };
    markRead();
  }, []);

  useEffect(() => {
    if (lastReadTs > 0 && news.length > 0) {
      const count = news.filter((n) => {
        const ts = typeof n.date === 'number' ? n.date * 1000 : new Date(n.date).getTime();
        return ts > lastReadTs;
      }).length;
      setUnreadCount(count);
    }
  }, [news, lastReadTs]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const isUnread = (item) => {
    const ts = typeof item.date === 'number' ? item.date * 1000 : new Date(item.date).getTime();
    return ts > lastReadTs;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 20 }}><SkeletonLoader lines={12} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={news}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <NewsCard item={item} unread={isUnread(item)} onPress={() => setSelected(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No news at the moment.</Text>
          </View>
        }
      />

      {/* Full news detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <ScrollView>
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
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: INACTIVE, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  sheetSource: { fontSize: 12, color: PRIMARY, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sheetDate: { fontSize: 12, color: INACTIVE, marginTop: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  sheetBody: { fontSize: 15, color: '#333', lineHeight: 24 },
});
