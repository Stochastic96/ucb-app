import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tooltip from '../../components/Tooltip';
import useStore from '../../store/useStore';
import { loadExamData, saveExamRegistrations } from '../../services/reminders';
import { trackEvent } from '../../services/analytics';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import calendarData from '../../data/semester_calendar.json';
import { useTranslation } from '../../services/i18n';

const QIS_URL = 'https://qis.hochschule-trier.de/';

function getCurrentSemesterCourses(courses) {
  if (!courses.length) return [];
  const counts = {};
  courses.forEach((c) => { if (c.semester) counts[c.semester] = (counts[c.semester] || 0) + 1; });
  const current = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return current ? courses.filter((c) => c.semester === current) : courses.slice(0, 10);
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

export default function ExamTrackerScreen({ navigation }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const infoBlue = c.mode === 'dark' ? '#90CAF9' : '#1976D2';
  const openSidebar = useStore((s) => s.openSidebar);
  const courses = useStore((s) => s.courses);
  const examRegistrations = useStore((s) => s.examRegistrations);
  const setExamRegistrations = useStore((s) => s.setExamRegistrations);
  const setExamRegistration = useStore((s) => s.setExamRegistration);

  useEffect(() => {
    loadExamData().then(({ registrations }) => setExamRegistrations(registrations)).catch(() => {});
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 4 }}>
          <Tooltip text={t('exam_tracker_tooltip')} />
          <TouchableOpacity onPress={openSidebar} hitSlop={12}>
            <Ionicons name="menu" size={24} color={c.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, []);

  const semCourses = useMemo(() => getCurrentSemesterCourses(courses), [courses]);

  const regDeadline = calendarData.semesters
    .find((s) => s.id === calendarData.current)
    ?.events.find((e) => e.id === 'ss26-exam-reg-end');

  const regDays = regDeadline ? daysUntil(regDeadline.date) : null;

  const toggleRegistered = async (course) => {
    const current = examRegistrations[course.id];
    const next = {
      courseId: course.id,
      courseTitle: course.title,
      registered: !current?.registered,
      registeredAt: !current?.registered ? new Date().toISOString() : null,
    };
    trackEvent('feature_use', 'exam_registration_toggled', { course_id: course.id, registered: next.registered });
    setExamRegistration(course.id, next);
    const updated = { ...examRegistrations, [course.id]: next };
    await saveExamRegistrations(updated);
  };

  const registeredCount = semCourses.filter((c) => examRegistrations[c.id]?.registered).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Deadline banner */}
      {regDeadline && regDays !== null && regDays >= 0 && (
        <View style={[styles.banner, regDays <= 7 && styles.bannerUrgent]}>
          <Ionicons
            name={regDays <= 7 ? 'alert-circle' : 'information-circle-outline'}
            size={20}
            color={regDays <= 7 ? c.error : infoBlue}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, regDays <= 7 && styles.bannerTitleUrgent]}>
              {t('exam_tracker_reg_deadline')}
            </Text>
            <Text style={styles.bannerSub}>
              {regDays === 0 ? t('exam_tracker_last_day') : t('exam_tracker_days_left', { days: regDays, date: regDeadline.date })}
            </Text>
          </View>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressTitle}>{t('exam_tracker_progress')}</Text>
          <Text style={styles.progressCount}>
            <Text style={{ color: c.primary, fontWeight: '800' }}>{registeredCount}</Text>
            /{semCourses.length} {t('common_courses')}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: semCourses.length ? `${(registeredCount / semCourses.length) * 100}%` : '0%' }]} />
        </View>
        <TouchableOpacity
          style={styles.qisBtn}
          onPress={() => Linking.openURL(QIS_URL).catch(() => {})}
          activeOpacity={0.8}
        >
          <Ionicons name="school-outline" size={16} color={c.brandIcon} />
          <Text style={styles.qisBtnText}>{t('exam_tracker_open_qis')}</Text>
          <Ionicons name="open-outline" size={14} color={c.brandIcon} />
        </TouchableOpacity>
      </View>

      {semCourses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={40} color={c.border} />
          <Text style={styles.emptyText}>{t('exam_tracker_no_courses')}</Text>
          <Text style={styles.emptySub}>{t('exam_tracker_pull_refresh')}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>{t('exam_tracker_courses_header')}</Text>
          {semCourses.map((course) => {
            const reg = examRegistrations[course.id];
            const registered = reg?.registered ?? false;
            return (
              <View key={course.id} style={styles.courseCard}>
                <View style={[styles.courseStripe, { backgroundColor: course.color ?? c.primary }]} />
                <View style={styles.courseBody}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  {course.lecturerName ? (
                    <Text style={styles.courseMeta}>{course.lecturerName}</Text>
                  ) : null}
                  <View style={styles.courseActions}>
                    <TouchableOpacity
                      style={[styles.regToggle, registered && styles.regToggleOn]}
                      onPress={() => toggleRegistered(course)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={registered ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={registered ? '#fff' : c.textMuted}
                      />
                      <Text style={[styles.regToggleText, registered && styles.regToggleTextOn]}>
                        {registered ? t('exam_tracker_registered') : t('exam_tracker_not_registered')}
                      </Text>
                    </TouchableOpacity>
                    {registered && (
                      <TouchableOpacity
                        style={styles.plannerBtn}
                        onPress={() => navigation.navigate('ExamPlanner', { courseId: course.id, courseTitle: course.title, courseColor: course.color })}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="document-text-outline" size={14} color={c.brandIcon} />
                        <Text style={styles.plannerBtnText}>{t('exam_tracker_planner')}</Text>
                        <Ionicons name="chevron-forward" size={14} color={c.brandIcon} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 12,
    padding: 14,
    backgroundColor: c.mode === 'dark' ? 'rgba(33,150,243,0.15)' : '#E3F2FD',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: c.mode === 'dark' ? '#90CAF9' : '#1976D2',
  },
  bannerUrgent: { backgroundColor: c.mode === 'dark' ? 'rgba(239,83,80,0.15)' : '#FFEBEE', borderLeftColor: c.error },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: c.mode === 'dark' ? '#90CAF9' : '#1976D2' },
  bannerTitleUrgent: { color: c.error },
  bannerSub: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  progressCard: {
    margin: 12,
    padding: 16,
    backgroundColor: c.surface,
    borderRadius: 14,
    shadowColor: c.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  progressCount: { fontSize: 14, color: c.textMuted },
  progressTrack: { height: 6, backgroundColor: c.surfaceSunken, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: c.primary, borderRadius: 3 },
  qisBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: c.accent, borderRadius: 10 },
  qisBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: c.brandIcon },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: c.textMuted, textAlign: 'center' },
  emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginBottom: 8,
  },
  courseCard: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  courseStripe: { width: 5 },
  courseBody: { flex: 1, padding: 14 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 },
  courseMeta: { fontSize: 13, color: c.textMuted, marginBottom: 10 },
  courseActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  regToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  regToggleOn: { backgroundColor: c.primary, borderColor: c.primary },
  regToggleText: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  regToggleTextOn: { color: '#fff' },
  plannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: c.accent,
  },
  plannerBtnText: { fontSize: 13, color: c.brandIcon, fontWeight: '600' },
});
