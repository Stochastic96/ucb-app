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
import useStore from '../../store/useStore';
import { loadExamData, saveExamRegistrations } from '../../services/reminders';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, ACCENT, ERROR, BORDER } from '../../constants/colors';
import calendarData from '../../data/semester_calendar.json';

const QIS_URL = 'https://qis.hochschule-trier.de/';

function getCurrentSemesterCourses(courses) {
  if (!courses.length) return [];
  // Find the most recent semester label
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
  const courses = useStore((s) => s.courses);
  const examRegistrations = useStore((s) => s.examRegistrations);
  const setExamRegistrations = useStore((s) => s.setExamRegistrations);
  const setExamRegistration = useStore((s) => s.setExamRegistration);

  useEffect(() => {
    loadExamData().then(({ registrations }) => setExamRegistrations(registrations)).catch(() => {});
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
            color={regDays <= 7 ? ERROR : '#1976D2'}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, regDays <= 7 && styles.bannerTitleUrgent]}>
              Exam registration deadline
            </Text>
            <Text style={styles.bannerSub}>
              {regDays === 0 ? 'Today is the last day!' : `${regDays} days left — closes ${regDeadline.date}`}
            </Text>
          </View>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressTitle}>Registration Progress</Text>
          <Text style={styles.progressCount}>
            <Text style={{ color: PRIMARY, fontWeight: '800' }}>{registeredCount}</Text>
            /{semCourses.length} courses
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
          <Ionicons name="school-outline" size={16} color={PRIMARY} />
          <Text style={styles.qisBtnText}>Open QIS to register</Text>
          <Ionicons name="open-outline" size={14} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {semCourses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={40} color={BORDER} />
          <Text style={styles.emptyText}>No courses found for the current semester</Text>
          <Text style={styles.emptySub}>Pull to refresh in the Home or Timetable screen</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Current Semester Courses</Text>
          {semCourses.map((course) => {
            const reg = examRegistrations[course.id];
            const registered = reg?.registered ?? false;
            return (
              <View key={course.id} style={styles.courseCard}>
                <View style={[styles.courseStripe, { backgroundColor: course.color ?? PRIMARY }]} />
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
                        color={registered ? '#fff' : INACTIVE}
                      />
                      <Text style={[styles.regToggleText, registered && styles.regToggleTextOn]}>
                        {registered ? 'Registered' : 'Not registered'}
                      </Text>
                    </TouchableOpacity>
                    {registered && (
                      <TouchableOpacity
                        style={styles.plannerBtn}
                        onPress={() => navigation.navigate('ExamPlanner', { courseId: course.id, courseTitle: course.title, courseColor: course.color })}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="document-text-outline" size={14} color={DARK} />
                        <Text style={styles.plannerBtnText}>Exam Planner</Text>
                        <Ionicons name="chevron-forward" size={14} color={DARK} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 12,
    padding: 14,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  bannerUrgent: { backgroundColor: '#FFEBEE', borderLeftColor: ERROR },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#1976D2' },
  bannerTitleUrgent: { color: ERROR },
  bannerSub: { fontSize: 13, color: '#444', marginTop: 2 },
  progressCard: {
    margin: 12,
    padding: 16,
    backgroundColor: BG,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  progressCount: { fontSize: 14, color: INACTIVE },
  progressTrack: { height: 6, backgroundColor: SURFACE, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },
  qisBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: ACCENT, borderRadius: 10 },
  qisBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: DARK },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: INACTIVE, textAlign: 'center' },
  emptySub: { fontSize: 13, color: INACTIVE, textAlign: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: INACTIVE,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginBottom: 8,
  },
  courseCard: {
    flexDirection: 'row',
    backgroundColor: BG,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  courseStripe: { width: 5 },
  courseBody: { flex: 1, padding: 14 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  courseMeta: { fontSize: 13, color: INACTIVE, marginBottom: 10 },
  courseActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  regToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  regToggleOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  regToggleText: { fontSize: 13, color: INACTIVE, fontWeight: '600' },
  regToggleTextOn: { color: '#fff' },
  plannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: ACCENT,
  },
  plannerBtnText: { fontSize: 13, color: DARK, fontWeight: '600' },
});
