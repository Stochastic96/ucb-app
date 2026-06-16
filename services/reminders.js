import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { trackEvent } from './analytics';
import useStore from '../store/useStore';
import * as logger from './logger';
import { Platform } from 'react-native';

const STORAGE_KEY = STORAGE_KEYS.GOING_STATE;

// Expo Notifications weekday: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
const DAY_WEEKDAY = {
  Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4,
  Thursday: 5, Friday: 6, Saturday: 7,
};

// Reminder lines — a balanced mix of professional and lighthearted options
const DEADLINE_LINES = [
  "Friendly reminder to complete your upcoming deadline. 🗓",
  "Please review and complete the task for your course.",
  "You have an active deadline that requires your attention.",
  "Organize your tasks: please review the due deadline.",
  "This is a reminder that you have a course deadline scheduled today."
];

const EVENT_LINES = [
  "An upcoming university event is scheduled for today.",
  "Reminder: Check out today's campus event.",
  "You are marked as attending this event today.",
  "Clear your schedule, it's time to show up! 🗓",
  "Please check details for the university event happening today."
];

const SPORT_LINES = [
  "Reminder: Your sports schedule starts shortly.",
  "Please prepare for your upcoming sport activity.",
  "Your registered sport session is scheduled today."
];

const EXAM_LINES_DAY = [
  "Important reminder: Your exam is scheduled tomorrow. Please prepare.",
  "Please review your details and prepare for the upcoming exam.",
  "This is a reminder to prepare for tomorrow's scheduled exam."
];

const EXAM_LINES_2H = [
  "Exam starting in 2 hours. Ensure you have all required materials.",
  "Your registered exam starts shortly. Good luck!",
  "Please note that your scheduled exam begins in two hours."
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Setup default notification channel on Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default Reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6FAE3E',
  }).catch((err) => {
    logger.error('Reminders', 'Failed to configure notification channel', err);
  });
}

export async function requestNotificationPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';

    // Auto-sync permission grant to app settings
    if (granted) {
      useStore.getState().updateSettings({ notificationsEnabled: true });
      try {
        const settings = useStore.getState().settings;
        await AsyncStorage.setItem('ucb_settings', JSON.stringify({ ...settings, notificationsEnabled: true }));
      } catch {}
    }

    return granted;
  } catch (err) {
    logger.error('Reminders', 'Failed to request notification permission', err);
    return false;
  }
}

// Subtract 30 min from HH:MM string, return { hour, minute } or null if result is before midnight
function thirtyMinBefore(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - 30;
  if (total < 0) return null; // sport starts before 00:30 — no valid pre-event time
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export async function scheduleEventReminder(ev) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    if (!ev.date) return false; // recurring events have no fixed date
    const eventDate = new Date(`${ev.date}T09:00:00`);
    if (isNaN(eventDate.getTime()) || eventDate <= new Date()) return false;

    const reminderLine = getRandomItem(EVENT_LINES);

    await Notifications.scheduleNotificationAsync({
      identifier: `event_${ev.id}`,
      content: {
        title: `Today: ${ev.title}`,
        body: `${reminderLine}\n(${ev.organizer} event is today!)`,
        sound: true,
      },
      trigger: {
        date: eventDate,
        channelId: 'default',
      },
    });
    trackEvent('feature_use', 'notification_scheduled', { type: 'event' });
    return true;
  } catch (err) {
    logger.error('Reminders', `Failed to schedule event reminder ${ev.id}`, err);
    return false;
  }
}

export async function scheduleSportReminder(sport) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    const weekday = DAY_WEEKDAY[sport.day];
    if (!weekday) return false;

    const timing = thirtyMinBefore(sport.startTime);
    if (!timing) return false; // sport starts before 00:30, skip reminder
    const { hour, minute } = timing;

    const reminderLine = getRandomItem(SPORT_LINES);

    await Notifications.scheduleNotificationAsync({
      identifier: `sport_${sport.id}`,
      content: {
        title: `${sport.sport} starts in 30 min`,
        body: `${reminderLine}\n${sport.startTime}–${sport.endTime} in ${sport.location} with ${sport.instructor}`,
        sound: true,
      },
      trigger: {
        weekday,
        hour,
        minute,
        repeats: true,
        channelId: 'default',
      },
    });
    trackEvent('feature_use', 'notification_scheduled', { type: 'sport' });
    return true;
  } catch (err) {
    logger.error('Reminders', `Failed to schedule sport reminder ${sport.id}`, err);
    return false;
  }
}

export async function cancelReminder(identifier) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    logger.error('Reminders', `Failed to cancel reminder ${identifier}`, err);
  }
}

// --- Deadline reminders ---

export async function scheduleDeadlineReminders(deadline) {
  try {
    // Request permission first — if granted, settings will auto-update
    const granted = await requestNotificationPermission();
    if (!granted) return {};

    const dueMs = new Date(deadline.dueDate).getTime();
    const ids = {};

    const subjectText = deadline.subject ? `[${deadline.subject}] ` : '';

    if (deadline.remind2h) {
      const t = new Date(dueMs - 2 * 60 * 60 * 1000);
      if (t > new Date()) {
        const reminderLine = getRandomItem(DEADLINE_LINES);
        await Notifications.scheduleNotificationAsync({
          identifier: `deadline_2h_${deadline.id}`,
          content: {
            title: `Due in 2 hours: ${deadline.title}`,
            body: `${reminderLine}\n${subjectText}${deadline.note || ''}`,
            sound: true,
          },
          trigger: {
            date: t,
            channelId: 'default',
          },
        });
        ids['2h'] = `deadline_2h_${deadline.id}`;
      }
    }

    if (deadline.remindOnTime) {
      const t = new Date(dueMs);
      if (t > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `deadline_ontime_${deadline.id}`,
          content: {
            title: `Due now: ${deadline.title}`,
            body: `This deadline is due now.\n${subjectText}${deadline.note || ''}`,
            sound: true,
          },
          trigger: {
            date: t,
            channelId: 'default',
          },
        });
        ids['ontime'] = `deadline_ontime_${deadline.id}`;
      }
    }

    if (Object.keys(ids).length > 0) {
      trackEvent('feature_use', 'notification_scheduled', { type: 'deadline' });
    }
    return ids;
  } catch (err) {
    logger.error('Reminders', `Failed to schedule deadline reminders ${deadline.id}`, err);
    return {};
  }
}

export async function cancelDeadlineReminders(deadlineId) {
  try { await Notifications.cancelScheduledNotificationAsync(`deadline_2h_${deadlineId}`); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(`deadline_ontime_${deadlineId}`); } catch {}
  // Legacy: cancel 24h reminders from old deadlines
  try { await Notifications.cancelScheduledNotificationAsync(`deadline_24h_${deadlineId}`); } catch {}
}

// --- Exam reminders ---

export async function scheduleExamReminders(exam) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return {};
    if (!exam.examDate || !exam.examTime) return {};

    const examMs = new Date(`${exam.examDate}T${exam.examTime}:00`).getTime();
    const ids = {};

    const dayBefore = new Date(examMs - 24 * 60 * 60 * 1000);
    if (dayBefore > new Date()) {
      const roomText = exam.room ? ` • Room ${exam.room}` : ' • Room TBD';
      const reminderLine = getRandomItem(EXAM_LINES_DAY);
      await Notifications.scheduleNotificationAsync({
        identifier: `exam_day_${exam.courseId}`,
        content: {
          title: `Exam tomorrow: ${exam.courseTitle}`,
          body: `${reminderLine}\n${exam.examTime}${roomText}${exam.building ? ', Building ' + exam.building : ''}`,
          sound: true,
        },
        trigger: {
          date: dayBefore,
          channelId: 'default',
        },
      });
      ids.dayBefore = `exam_day_${exam.courseId}`;
    }

    const twoHour = new Date(examMs - 2 * 60 * 60 * 1000);
    if (twoHour > new Date()) {
      const roomText = exam.room ? `Room ${exam.room}` : 'Check room assignment';
      const reminderLine = getRandomItem(EXAM_LINES_2H);
      await Notifications.scheduleNotificationAsync({
        identifier: `exam_2h_${exam.courseId}`,
        content: {
          title: `Exam in 2 hours: ${exam.courseTitle}`,
          body: `${reminderLine}\n${roomText}${exam.building ? ', Building ' + exam.building : ''}`,
          sound: true,
        },
        trigger: {
          date: twoHour,
          channelId: 'default',
        },
      });
      ids.twoHour = `exam_2h_${exam.courseId}`;
    }

    if (Object.keys(ids).length > 0) {
      trackEvent('feature_use', 'notification_scheduled', { type: 'exam' });
    }
    return ids;
  } catch (err) {
    logger.error('Reminders', `Failed to schedule exam reminders ${exam.courseId}`, err);
    return {};
  }
}

export async function cancelExamReminders(courseId) {
  try { await Notifications.cancelScheduledNotificationAsync(`exam_day_${courseId}`); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(`exam_2h_${courseId}`); } catch {}
}

// --- AsyncStorage helpers for new features ---

export async function loadDeadlines() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEADLINES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveDeadlines(deadlines) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEADLINES, JSON.stringify(deadlines));
  } catch {}
}

export async function loadExamData() {
  try {
    const [regRaw, planRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.EXAM_REGISTRATIONS),
      AsyncStorage.getItem(STORAGE_KEYS.EXAM_PLANS),
    ]);
    return {
      registrations: regRaw ? JSON.parse(regRaw) : {},
      plans: planRaw ? JSON.parse(planRaw) : {},
    };
  } catch { return { registrations: {}, plans: {} }; }
}

export async function saveExamRegistrations(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXAM_REGISTRATIONS, JSON.stringify(data));
  } catch {}
}

export async function saveExamPlans(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXAM_PLANS, JSON.stringify(data));
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
