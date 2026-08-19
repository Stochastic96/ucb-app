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
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
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
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
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
      <View style={[styles.colorBar, { backgroundColor: color ?? c.primary }]} />

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
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
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
          onPress={() => item.downloadUrl && /^https?:/i.test(item.downloadUrl) && Linking.openURL(item.downloadUrl).catch(() => {})}
        >
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function AnnouncementsTab({ items, t }) {
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },
  colorBar: { height: 4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: c.primary },
  tabText: { ...c.type.bodySm, fontSize: 14, color: c.textMuted },
  tabTextActive: { color: c.primary, fontFamily: c.fonts.bodyBold },
  sectionLabel: { ...c.type.micro, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  bodyText: { ...c.type.bodySm, fontSize: 14, color: c.text, lineHeight: 22 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  fileName: { ...c.type.bodySm, fontSize: 14, flex: 1, color: c.brandIcon },
  fileSize: { ...c.type.caption, color: c.textMuted, marginLeft: 8 },
  announceCard: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  announceDate: { ...c.type.micro, fontFamily: c.fonts.body, color: c.textMuted, marginBottom: 4 },
  announceTitle: { ...c.type.bodyStrong, color: c.text, marginBottom: 6 },
  announceBody: { ...c.type.bodySm, color: c.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { ...c.type.bodySm, fontSize: 14, color: c.textMuted, textAlign: 'center' },
});
