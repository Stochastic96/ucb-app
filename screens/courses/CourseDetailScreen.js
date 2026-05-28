import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { fetchCourseDetail, fetchCourseFiles, fetchCourseAnnouncements } from '../../services/courses';
import SkeletonLoader from '../../components/SkeletonLoader';
import { PRIMARY, INACTIVE, SURFACE, BG, BORDER } from '../../constants/colors';
import { useTranslation } from '../../services/i18n';

const TAB_KEYS = ['course_tab_info', 'course_tab_files', 'course_tab_announcements'];

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(parseInt(iso, 10) * 1000 || iso).toLocaleDateString('en-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CourseDetailScreen({ route }) {
  const t = useTranslation();
  const { courseId, color } = route.params ?? {};
  const [activeTab, setActiveTab] = useState(TAB_KEYS[0]);
  const [detail, setDetail] = useState(null);
  const [files, setFiles] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetchCourseDetail(courseId),
      fetchCourseFiles(courseId),
      fetchCourseAnnouncements(courseId),
    ]).then(([detailRes, filesRes, announceRes]) => {
      if (detailRes.status === 'fulfilled') setDetail(detailRes.value.data);
      if (filesRes.status === 'fulfilled') setFiles(filesRes.value.data);
      if (announceRes.status === 'fulfilled') setAnnouncements(announceRes.value.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [courseId]);

  return (
    <View style={styles.container}>
      {/* Color accent bar */}
      <View style={[styles.colorBar, { backgroundColor: color ?? PRIMARY }]} />

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TAB_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{t(key)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 20 }}><SkeletonLoader lines={6} /></View>
      ) : (
        <>
          {activeTab === TAB_KEYS[0] && <InfoTab detail={detail} t={t} />}
          {activeTab === TAB_KEYS[1] && <FilesTab files={files} t={t} />}
          {activeTab === TAB_KEYS[2] && <AnnouncementsTab items={announcements} t={t} />}
        </>
      )}
    </View>
  );
}

function InfoTab({ detail, t }) {
  const attrs = detail?.attributes ?? {};
  const description = attrs.description ?? t('course_no_description');
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.sectionLabel}>{t('course_description')}</Text>
      <Text style={styles.bodyText}>{description}</Text>
    </ScrollView>
  );
}

function FilesTab({ files, t }) {
  if (!files.length) {
    return <EmptyTab message={t('course_no_files')} />;
  }
  return (
    <FlatList
      data={files}
      keyExtractor={(f) => f.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.fileRow}
          onPress={() => item.downloadUrl && /^https?:/i.test(item.downloadUrl) && Linking.openURL(item.downloadUrl)}
        >
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function AnnouncementsTab({ items, t }) {
  if (!items.length) {
    return <EmptyTab message={t('course_no_announcements')} />;
  }
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.announceCard}>
          <Text style={styles.announceDate}>{formatDate(item.date)}</Text>
          <Text style={styles.announceTitle}>{item.title}</Text>
          <Text style={styles.announceBody}>{stripHtml(item.body)}</Text>
        </View>
      )}
    />
  );
}

function EmptyTab({ message }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  colorBar: { height: 4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, color: INACTIVE },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },
  sectionLabel: { fontSize: 11, color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  bodyText: { fontSize: 14, color: '#1A1A1A', lineHeight: 22 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  fileName: { flex: 1, fontSize: 14, color: PRIMARY },
  fileSize: { fontSize: 12, color: INACTIVE, marginLeft: 8 },
  announceCard: {
    backgroundColor: SURFACE,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  announceDate: { fontSize: 11, color: INACTIVE, marginBottom: 4 },
  announceTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  announceBody: { fontSize: 13, color: '#444', lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: INACTIVE, fontSize: 14, textAlign: 'center' },
});
