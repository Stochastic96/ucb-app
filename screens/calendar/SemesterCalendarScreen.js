import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import calendarData from '../../data/semester_calendar.json';
import { trackScreen } from '../../services/analytics';
import useStore from '../../store/useStore';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { useTranslation } from '../../services/i18n';

const QIS_URL = 'https://qis.hochschule-trier.de/';

const CATEGORY_CONFIG = {
  academic: { color: '#1976D2', bg: '#E3F2FD', labelKey: 'calendar_filter_academic' },
  exams:    { color: '#E65100', bg: '#FBE9E7', labelKey: 'calendar_filter_exams' },
  admin:    { color: '#6A1B9A', bg: '#F3E5F5', labelKey: 'calendar_filter_admin' },
  holiday:  { color: '#2E7D32', bg: '#E8F5E9', labelKey: 'calendar_filter_holiday' },
};

const TAB_KEYS = ['calendar_overview', 'calendar_key_dates', 'calendar_my_courses'];

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function semesterProgress(sem) {
  const now = Date.now();
  const start = new Date(sem.lectureStart).getTime();
  const end = new Date(sem.lectureEnd).getTime();
  if (now < start) return 0;
  if (now > end) return 1;
  return (now - start) / (end - start);
}

function getCurrentSemesterCourses(courses) {
  if (!courses.length) return [];
  const counts = {};
  courses.forEach((c) => { if (c.semester) counts[c.semester] = (counts[c.semester] || 0) + 1; });
  const current = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return current ? courses.filter((c) => c.semester === current) : courses.slice(0, 10);
}

export default function SemesterCalendarScreen({ navigation }) {
  const t = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const semester = calendarData.semesters.find((s) => s.id === calendarData.current) ?? calendarData.semesters[0];
  const courses = useStore((s) => s.courses);
  const [activeTab, setActiveTab] = useState(TAB_KEYS[0]);

  useFocusEffect(useCallback(() => {
    trackScreen('SemesterCalendarScreen');
  }, []));

  const progress = useMemo(() => semesterProgress(semester), [semester]);
  const progressPct = Math.round(progress * 100);

  const semCourses = useMemo(() => getCurrentSemesterCourses(courses), [courses]);

  const upcoming = useMemo(() =>
    semester.events
      .filter((e) => daysUntil(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5),
    [semester.events]
  );

  const examRegEvent = semester.events.find((e) => e.id === 'ss26-exam-reg-start');
  const examRegDeadline = semester.events.find((e) => e.id === 'ss26-exam-reg-end');
  const examPeriod = semester.events.find((e) => e.id === 'ss26-exam-period');
  const reenrollment = semester.events.find((e) => e.id === 'ss26-reenrollment');

  return (
    <View style={styles.container}>
      {/* Semester header */}
      <View style={styles.semHeader}>
        <View style={styles.semHeaderTop}>
          <View style={[styles.semBadge, { backgroundColor: semester.color }]}>
            <Text style={styles.semBadgeText}>{semester.shortName}</Text>
          </View>
          <Text style={styles.semName}>{semester.name}</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressPct}{t('calendar_lectures_pct')}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
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

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === TAB_KEYS[0] && (
          <OverviewTab
            semester={semester}
            upcoming={upcoming}
            progressPct={progressPct}
            examRegEvent={examRegEvent}
            examRegDeadline={examRegDeadline}
            examPeriod={examPeriod}
            reenrollment={reenrollment}
            navigation={navigation}
            t={t}
          />
        )}
        {activeTab === TAB_KEYS[1] && (
          <KeyDatesTab events={semester.events} t={t} />
        )}
        {activeTab === TAB_KEYS[2] && (
          <MyCoursesTab semCourses={semCourses} semester={semester} navigation={navigation} t={t} />
        )}
      </ScrollView>
    </View>
  );
}

function OverviewTab({ semester, upcoming, examRegEvent, examRegDeadline, examPeriod, reenrollment, navigation, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const examRegDays = examRegDeadline ? daysUntil(examRegDeadline.date) : null;
  const infoBlue = c.mode === 'dark' ? '#90CAF9' : '#1565C0';

  return (
    <>
      {/* Exam registration alert */}
      {examRegDeadline && examRegDays !== null && examRegDays >= 0 && examRegDays <= 30 && (
        <View style={[styles.alertBox, examRegDays <= 7 && styles.alertBoxUrgent]}>
          <Ionicons name={examRegDays <= 7 ? 'alert-circle' : 'information-circle-outline'} size={20}
            color={examRegDays <= 7 ? c.error : infoBlue} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, examRegDays <= 7 && { color: c.error }]}>
              {t('calendar_exam_reg')}{examRegDays === 0 ? ` ${t('calendar_exam_reg_today')}` : ` ${t('calendar_exam_reg_days', { days: examRegDays })}`}
            </Text>
            <Text style={styles.alertSub}>{t('calendar_register_before', { date: examRegDeadline.date })}</Text>
          </View>
          <TouchableOpacity
            style={styles.alertBtn}
            onPress={() => Linking.openURL(QIS_URL).catch(() => {})}
          >
            <Text style={styles.alertBtnText}>{t('calendar_open_qis')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Key milestones */}
      <Text style={styles.groupLabel}>{t('calendar_milestones')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestonesRow}>
        <MilestoneCard
          icon="school-outline"
          label={t('calendar_lectures')}
          dates={`${formatDate(semester.lectureStart)} →\n${formatDate(semester.lectureEnd)}`}
          color="#1976D2"
        />
        {examRegEvent && (
          <MilestoneCard
            icon="create-outline"
            label={t('calendar_exam_reg')}
            dates={`${formatDate(examRegEvent.date)} →\n${formatDate(examRegDeadline?.date ?? examRegEvent.date)}`}
            color="#E65100"
            urgent={examRegDays !== null && examRegDays >= 0 && examRegDays <= 14}
            t={t}
          />
        )}
        {examPeriod && (
          <MilestoneCard
            icon="document-text-outline"
            label={t('calendar_exam_period')}
            dates={`${formatDate(examPeriod.date)} →\n${formatDate(examPeriod.endDate ?? examPeriod.date)}`}
            color="#6A1B9A"
          />
        )}
        {reenrollment && (
          <MilestoneCard
            icon="card-outline"
            label={t('calendar_reenrollment')}
            dates={`Deadline:\n${formatDate(reenrollment.date)}`}
            color="#00796B"
          />
        )}
      </ScrollView>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <>
          <Text style={styles.groupLabel}>{t('calendar_upcoming')}</Text>
          {upcoming.map((ev) => (
            <CompactEventRow key={ev.id} event={ev} t={t} />
          ))}
        </>
      )}

      {/* Quick actions */}
      <Text style={styles.groupLabel}>{t('calendar_quick_actions')}</Text>
      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => Linking.openURL(QIS_URL).catch(() => {})}
        activeOpacity={0.8}
      >
        <View style={styles.qaIcon}><Ionicons name="school-outline" size={20} color={c.brandIcon} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.qaLabel}>{t('calendar_qis_label')}</Text>
          <Text style={styles.qaSub}>{t('calendar_qis_desc')}</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={c.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => Linking.openURL('https://idp.fh-trier.de/idp/profile/SAML2/Redirect/SSO?execution=e5s1&lang=en').catch(() => {})}
        activeOpacity={0.8}
      >
        <View style={styles.qaIcon}><Ionicons name="document-outline" size={20} color={c.brandIcon} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.qaLabel}>{t('calendar_portal_label')}</Text>
          <Text style={styles.qaSub}>{t('calendar_portal_desc')}</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={c.textMuted} />
      </TouchableOpacity>
    </>
  );
}

function MilestoneCard({ icon, label, dates, color, urgent, t }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.milestoneCard, urgent && styles.milestoneCardUrgent]}>
      <View style={[styles.milestoneIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.milestoneLabel}>{label}</Text>
      <Text style={styles.milestoneDates}>{dates}</Text>
      {urgent && (
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentBadgeText}>{t ? t('calendar_soon') : 'Soon'}</Text>
        </View>
      )}
    </View>
  );
}

function CompactEventRow({ event, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.academic;
  const chipBg = c.mode === 'dark' ? cfg.color + '26' : cfg.bg;
  const days = daysUntil(event.date);
  return (
    <View style={styles.compactRow}>
      <View style={[styles.compactStripe, { backgroundColor: cfg.color }]} />
      <View style={styles.compactBody}>
        <Text style={styles.compactTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.compactDate}>{formatDate(event.date)}</Text>
      </View>
      <View style={[styles.chip, { backgroundColor: chipBg }]}>
        <Text style={[styles.chipText, { color: cfg.color }]}>
          {days === 0 ? t('calendar_today') : days === 1 ? t('calendar_tomorrow') : t('calendar_days', { days })}
        </Text>
      </View>
    </View>
  );
}

function KeyDatesTab({ events, t }) {
  const styles = useThemedStyles(makeStyles);
  const [filter, setFilter] = useState('all');
  const sorted = useMemo(() =>
    events
      .filter((e) => filter === 'all' || e.category === filter)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date)),
    [events, filter]
  );
  const past = sorted.filter((e) => daysUntil(e.date) < 0);
  const upcoming = sorted.filter((e) => daysUntil(e.date) >= 0);

  const filterKeys = ['all', 'academic', 'exams', 'admin', 'holiday'];

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filterKeys.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const active = filter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, active && (cfg ? { backgroundColor: cfg.color, borderColor: cfg.color } : styles.filterChipActive)]}
              onPress={() => setFilter(cat)}
            >
              <Text style={[styles.filterChipText, active && { color: '#fff' }]}>
                {cat === 'all' ? t('calendar_filter_all') : t(cfg?.labelKey ?? cat)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {upcoming.length > 0 && (
        <>
          <Text style={styles.groupLabel}>{t('calendar_upcoming')}</Text>
          {upcoming.map((ev) => <FullEventRow key={ev.id} event={ev} t={t} />)}
        </>
      )}
      {past.length > 0 && (
        <>
          <Text style={[styles.groupLabel, styles.groupLabelMuted]}>{t('calendar_filter_past')}</Text>
          {[...past].reverse().map((ev) => <FullEventRow key={ev.id} event={ev} past t={t} />)}
        </>
      )}
    </>
  );
}

function FullEventRow({ event, past, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.academic;
  const cfgBg = c.mode === 'dark' ? cfg.color + '26' : cfg.bg;
  const days = daysUntil(event.date);
  return (
    <TouchableOpacity
      style={[styles.fullRow, past && { opacity: 0.55 }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={[styles.compactStripe, { backgroundColor: past ? c.textMuted : cfg.color, height: '100%' }]} />
      <View style={styles.compactBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {event.important && !past && <Ionicons name="alert-circle" size={14} color={cfg.color} />}
          <Text style={styles.compactTitle} numberOfLines={expanded ? 0 : 1}>{event.title}</Text>
        </View>
        <Text style={styles.compactDate}>
          {formatDate(event.date)}{event.endDate && event.endDate !== event.date ? ` — ${formatDate(event.endDate)}` : ''}
        </Text>
        {expanded && event.description ? (
          <Text style={styles.expandedDesc}>{event.description}</Text>
        ) : null}
        <View style={[styles.catChip, { backgroundColor: past ? c.surfaceSunken : cfgBg }]}>
          <Text style={[styles.catChipText, { color: past ? c.textMuted : cfg.color }]}>{t(cfg.labelKey)}</Text>
        </View>
      </View>
      <View style={[styles.chip, { backgroundColor: past ? c.surfaceSunken : cfgBg, marginLeft: 4 }]}>
        <Text style={[styles.chipText, { color: past ? c.textMuted : cfg.color }]}>
          {past ? t('calendar_done') : days === 0 ? t('calendar_today') : t('calendar_days', { days })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function MyCoursesTab({ semCourses, semester, navigation, t }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!semCourses.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="albums-outline" size={44} color={c.border} />
        <Text style={styles.emptyTitle}>{t('calendar_no_courses')}</Text>
        <Text style={styles.emptySub}>{t('calendar_no_courses_hint')}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.coursesHeader}>
        <Text style={styles.coursesCount}>{t('calendar_courses_count', { count: semCourses.length, semester: semester.shortName })}</Text>
        <TouchableOpacity onPress={() => navigation.getParent()?.getParent()?.navigate('CoursesList')}>
          <Text style={styles.coursesLink}>{t('calendar_view_all')}</Text>
        </TouchableOpacity>
      </View>

      {semCourses.map((course) => (
        <TouchableOpacity
          key={course.id}
          style={styles.courseCard}
          onPress={() => navigation.getParent()?.getParent()?.navigate('CourseDetail', {
            courseId: course.id,
            title: course.title,
            color: course.color,
          })}
          activeOpacity={0.75}
        >
          <View style={[styles.courseStripe, { backgroundColor: course.color ?? c.primary }]} />
          <View style={styles.courseBody}>
            <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
            {course.lecturer ? <Text style={styles.courseMeta}>{course.lecturer}</Text> : null}
            {course.semester ? <Text style={styles.courseSem}>{course.semester}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={styles.examReminderBox}>
        <Ionicons name="bulb-outline" size={18} color={c.brandIcon} />
        <Text style={styles.examReminderText}>{t('calendar_exam_tracker_hint')}</Text>
      </View>
    </>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 40 },
  semHeader: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  semHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  semBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  semBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  semName: { fontSize: 15, fontWeight: '700', color: c.text },
  progressRow: { gap: 5 },
  progressTrack: { height: 5, backgroundColor: c.surfaceSunken, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: c.primary, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: c.textMuted },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: c.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.primary },
  groupLabel: {
    fontSize: 11, fontWeight: '700', color: c.brandIcon,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  groupLabelMuted: { color: c.textMuted },
  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 12, padding: 14, backgroundColor: c.mode === 'dark' ? 'rgba(33,150,243,0.15)' : '#E3F2FD',
    borderRadius: 12, borderLeftWidth: 4, borderLeftColor: c.mode === 'dark' ? '#90CAF9' : '#1565C0',
  },
  alertBoxUrgent: { backgroundColor: c.mode === 'dark' ? 'rgba(239,83,80,0.15)' : '#FFEBEE', borderLeftColor: c.error },
  alertTitle: { fontSize: 14, fontWeight: '700', color: c.mode === 'dark' ? '#90CAF9' : '#1565C0' },
  alertSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  alertBtn: { backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  alertBtnText: { fontSize: 12, fontWeight: '700', color: c.onPrimary },
  milestonesRow: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  milestoneCard: {
    width: 150, backgroundColor: c.surface, borderRadius: 14, padding: 14,
    shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  milestoneCardUrgent: { borderWidth: 1.5, borderColor: '#E65100' },
  milestoneIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  milestoneLabel: { fontSize: 12, fontWeight: '700', color: c.text, marginBottom: 6 },
  milestoneDates: { fontSize: 11, color: c.textMuted, lineHeight: 16 },
  urgentBadge: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: c.mode === 'dark' ? 'rgba(230,81,0,0.2)' : '#FBE9E7', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  urgentBadgeText: { fontSize: 10, fontWeight: '700', color: c.mode === 'dark' ? '#FFB74D' : '#E65100' },
  compactRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: 10, overflow: 'hidden', paddingRight: 12,
    shadowColor: c.shadow, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  fullRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: 10, overflow: 'hidden', paddingRight: 12, paddingVertical: 2,
    shadowColor: c.shadow, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  compactStripe: { width: 4, alignSelf: 'stretch' },
  compactBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 3 },
  compactTitle: { fontSize: 14, fontWeight: '600', color: c.text },
  compactDate: { fontSize: 12, color: c.textMuted },
  expandedDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18, marginTop: 6 },
  catChip: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: 6 },
  catChipText: { fontSize: 10, fontWeight: '700' },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center', alignSelf: 'center' },
  chipText: { fontSize: 12, fontWeight: '700' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  filterChipText: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 8,
    padding: 14, borderRadius: 12,
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  qaIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 14, fontWeight: '600', color: c.text },
  qaSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', padding: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textMuted },
  emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19 },
  coursesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
  coursesCount: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  coursesLink: { fontSize: 13, color: c.brandIcon, fontWeight: '600' },
  courseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, overflow: 'hidden', paddingRight: 12,
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  courseStripe: { width: 5, alignSelf: 'stretch' },
  courseBody: { flex: 1, padding: 12 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  courseMeta: { fontSize: 13, color: c.textMuted, marginTop: 3 },
  courseSem: { fontSize: 11, color: c.textMuted, marginTop: 4, fontStyle: 'italic' },
  examReminderBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    margin: 12, marginTop: 16, padding: 14,
    backgroundColor: c.accent, borderRadius: 12,
  },
  examReminderText: { flex: 1, fontSize: 13, color: c.brandIcon, lineHeight: 19 },
});
