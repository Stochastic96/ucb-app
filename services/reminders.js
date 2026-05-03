import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ucb_going_state';

// weekday: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
const DAY_WEEKDAY = { Monday: 2, Wednesday: 4, Thursday: 5 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Subtract 30 min from HH:MM string, return { hour, minute }
function thirtyMinBefore(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - 30;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export async function scheduleEventReminder(ev) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const eventDate = new Date(`${ev.date}T09:00:00`);
  if (eventDate <= new Date()) return false; // past event

  await Notifications.scheduleNotificationAsync({
    identifier: `event_${ev.id}`,
    content: {
      title: `Today: ${ev.title}`,
      body: `Don't forget — ${ev.organizer} event is today!`,
      sound: true,
    },
    trigger: eventDate,
  });
  return true;
}

export async function scheduleSportReminder(sport) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const weekday = DAY_WEEKDAY[sport.day];
  if (!weekday) return false;

  const { hour, minute } = thirtyMinBefore(sport.startTime);

  await Notifications.scheduleNotificationAsync({
    identifier: `sport_${sport.id}`,
    content: {
      title: `${sport.sport} starts in 30 min`,
      body: `${sport.startTime}–${sport.endTime} in ${sport.location} with ${sport.instructor}`,
      sound: true,
    },
    trigger: {
      weekday,
      hour,
      minute,
      repeats: true,
    },
  });
  return true;
}

export async function cancelReminder(identifier) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// --- Deadline reminders ---

export async function scheduleDeadlineReminders(deadline) {
  const granted = await requestNotificationPermission();
  if (!granted) return {};

  const dueMs = new Date(deadline.dueDate).getTime();
  const ids = {};

  if (deadline.remind24h) {
    const t = new Date(dueMs - 24 * 60 * 60 * 1000);
    if (t > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `deadline_24h_${deadline.id}`,
        content: {
          title: `Due tomorrow: ${deadline.title}`,
          body: deadline.subject ? `${deadline.subject}${deadline.note ? ' — ' + deadline.note : ''}` : (deadline.note || ''),
          sound: true,
        },
        trigger: t,
      });
      ids['24h'] = `deadline_24h_${deadline.id}`;
    }
  }

  if (deadline.remind2h) {
    const t = new Date(dueMs - 2 * 60 * 60 * 1000);
    if (t > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `deadline_2h_${deadline.id}`,
        content: {
          title: `Due in 2 hours: ${deadline.title}`,
          body: deadline.subject ? `${deadline.subject}${deadline.note ? ' — ' + deadline.note : ''}` : (deadline.note || ''),
          sound: true,
        },
        trigger: t,
      });
      ids['2h'] = `deadline_2h_${deadline.id}`;
    }
  }

  return ids;
}

export async function cancelDeadlineReminders(deadlineId) {
  await Notifications.cancelScheduledNotificationAsync(`deadline_24h_${deadlineId}`);
  await Notifications.cancelScheduledNotificationAsync(`deadline_2h_${deadlineId}`);
}

// --- Exam reminders ---

export async function scheduleExamReminders(exam) {
  const granted = await requestNotificationPermission();
  if (!granted) return {};
  if (!exam.examDate || !exam.examTime) return {};

  const examMs = new Date(`${exam.examDate}T${exam.examTime}:00`).getTime();
  const ids = {};

  const dayBefore = new Date(examMs - 24 * 60 * 60 * 1000);
  if (dayBefore > new Date()) {
    const roomText = exam.room ? ` • Room ${exam.room}` : ' • Room TBD';
    await Notifications.scheduleNotificationAsync({
      identifier: `exam_day_${exam.courseId}`,
      content: {
        title: `Exam tomorrow: ${exam.courseTitle}`,
        body: `${exam.examTime}${roomText}${exam.building ? ', Building ' + exam.building : ''}`,
        sound: true,
      },
      trigger: dayBefore,
    });
    ids.dayBefore = `exam_day_${exam.courseId}`;
  }

  const twoHour = new Date(examMs - 2 * 60 * 60 * 1000);
  if (twoHour > new Date()) {
    const roomText = exam.room ? `Room ${exam.room}` : 'Check room assignment';
    await Notifications.scheduleNotificationAsync({
      identifier: `exam_2h_${exam.courseId}`,
      content: {
        title: `Exam in 2 hours: ${exam.courseTitle}`,
        body: `${roomText}${exam.building ? ', Building ' + exam.building : ''}`,
        sound: true,
      },
      trigger: twoHour,
    });
    ids.twoHour = `exam_2h_${exam.courseId}`;
  }

  return ids;
}

export async function cancelExamReminders(courseId) {
  await Notifications.cancelScheduledNotificationAsync(`exam_day_${courseId}`);
  await Notifications.cancelScheduledNotificationAsync(`exam_2h_${courseId}`);
}

// --- AsyncStorage helpers for new features ---

export async function loadDeadlines() {
  try {
    const raw = await AsyncStorage.getItem('ucb_deadlines');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveDeadlines(deadlines) {
  try {
    await AsyncStorage.setItem('ucb_deadlines', JSON.stringify(deadlines));
  } catch {}
}

export async function loadExamData() {
  try {
    const [regRaw, planRaw] = await Promise.all([
      AsyncStorage.getItem('ucb_exam_reg'),
      AsyncStorage.getItem('ucb_exam_plans'),
    ]);
    return {
      registrations: regRaw ? JSON.parse(regRaw) : {},
      plans: planRaw ? JSON.parse(planRaw) : {},
    };
  } catch { return { registrations: {}, plans: {} }; }
}

export async function saveExamRegistrations(data) {
  try {
    await AsyncStorage.setItem('ucb_exam_reg', JSON.stringify(data));
  } catch {}
}

export async function saveExamPlans(data) {
  try {
    await AsyncStorage.setItem('ucb_exam_plans', JSON.stringify(data));
  } catch {}
}

// --- Persistence ---

export async function loadGoingState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { goingEventIds: [], goingSportIds: [] };
    return JSON.parse(raw);
  } catch {
    return { goingEventIds: [], goingSportIds: [] };
  }
}

export async function saveGoingState(goingEventIds, goingSportIds) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ goingEventIds, goingSportIds }));
  } catch {
    // non-fatal
  }
}
