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
