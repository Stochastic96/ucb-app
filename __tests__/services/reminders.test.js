// Mock the native notification surface and the store/analytics dependencies so
// scheduling logic can be asserted without touching the device or Supabase.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5 },
}));

const mockStoreState = { settings: {}, updateSettings: jest.fn() };
jest.mock('../../store/useStore', () => ({
  __esModule: true,
  default: { getState: () => mockStoreState },
}));

jest.mock('../../services/analytics', () => ({ trackEvent: jest.fn() }));

import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermission,
  scheduleEventReminder,
  scheduleSportReminder,
  scheduleDeadlineReminders,
  cancelDeadlineReminders,
  scheduleExamReminders,
  cancelExamReminders,
} from '../../services/reminders';

// A date comfortably in the future so all "> now" guards pass.
const FUTURE_DATE = '2999-01-15';

beforeEach(() => {
  jest.clearAllMocks();
  Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
});

describe('requestNotificationPermission', () => {
  it('returns true and syncs settings when granted', async () => {
    const granted = await requestNotificationPermission();
    expect(granted).toBe(true);
    expect(mockStoreState.updateSettings).toHaveBeenCalledWith({ notificationsEnabled: true });
  });

  it('returns false when denied and does not touch settings', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const granted = await requestNotificationPermission();
    expect(granted).toBe(false);
    expect(mockStoreState.updateSettings).not.toHaveBeenCalled();
  });
});

describe('scheduleEventReminder', () => {
  it('schedules a one-time reminder with an event_ identifier', async () => {
    const ok = await scheduleEventReminder({ id: 'ev1', title: 'Hackathon', organizer: 'CS', date: FUTURE_DATE });
    expect(ok).toBe(true);
    const arg = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('event_ev1');
    expect(arg.trigger.date).toBeInstanceOf(Date);
  });

  it('skips events with no date or a past date', async () => {
    expect(await scheduleEventReminder({ id: 'x', title: 't', organizer: 'o' })).toBe(false);
    expect(await scheduleEventReminder({ id: 'x', title: 't', organizer: 'o', date: '2000-01-01' })).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('returns false without scheduling when permission is denied', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    expect(await scheduleEventReminder({ id: 'x', title: 't', organizer: 'o', date: FUTURE_DATE })).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('scheduleSportReminder', () => {
  const sport = {
    id: 's1', day: 'Wednesday', sport: 'Climbing',
    startTime: '18:00', endTime: '20:00', location: 'Hall', instructor: 'Max',
  };

  it('schedules a weekly repeating reminder 30 min before start', async () => {
    const ok = await scheduleSportReminder(sport);
    expect(ok).toBe(true);
    const arg = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('sport_s1');
    expect(arg.trigger).toMatchObject({ weekday: 4, hour: 17, minute: 30, repeats: true });
  });

  it('skips a sport that starts before 00:30 (no valid pre-event time)', async () => {
    expect(await scheduleSportReminder({ ...sport, startTime: '00:15' })).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('skips an unrecognised weekday', async () => {
    expect(await scheduleSportReminder({ ...sport, day: 'Funday' })).toBe(false);
  });
});

describe('scheduleDeadlineReminders', () => {
  it('schedules both 2h and on-time tiers per flags', async () => {
    const ids = await scheduleDeadlineReminders({
      id: 'd1', title: 'Essay', dueDate: `${FUTURE_DATE}T12:00:00`,
      remind2h: true, remindOnTime: true,
    });
    expect(ids).toEqual({ '2h': 'deadline_2h_d1', ontime: 'deadline_ontime_d1' });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('schedules only the requested tier', async () => {
    const ids = await scheduleDeadlineReminders({
      id: 'd2', title: 'Quiz', dueDate: `${FUTURE_DATE}T12:00:00`,
      remind2h: true, remindOnTime: false,
    });
    expect(ids).toEqual({ '2h': 'deadline_2h_d2' });
  });

  it('schedules nothing for a past due date', async () => {
    const ids = await scheduleDeadlineReminders({
      id: 'd3', title: 'Old', dueDate: '2000-01-01T12:00:00',
      remind2h: true, remindOnTime: true,
    });
    expect(ids).toEqual({});
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelDeadlineReminders', () => {
  it('cancels the 2h, on-time, and legacy 24h identifiers', async () => {
    await cancelDeadlineReminders('d1');
    const ids = Notifications.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]);
    expect(ids).toEqual(['deadline_2h_d1', 'deadline_ontime_d1', 'deadline_24h_d1']);
  });
});

describe('scheduleExamReminders', () => {
  it('schedules 24h and 2h tiers keyed by courseId', async () => {
    const ids = await scheduleExamReminders({
      courseId: 'c1', courseTitle: 'Algo', examDate: FUTURE_DATE, examTime: '09:00', room: '101',
    });
    expect(ids).toEqual({ dayBefore: 'exam_day_c1', twoHour: 'exam_2h_c1' });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('returns {} when examDate/examTime is missing', async () => {
    expect(await scheduleExamReminders({ courseId: 'c2', courseTitle: 'X' })).toEqual({});
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelExamReminders', () => {
  it('cancels both exam identifiers for the course', async () => {
    await cancelExamReminders('c1');
    const ids = Notifications.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]);
    expect(ids).toEqual(['exam_day_c1', 'exam_2h_c1']);
  });
});
