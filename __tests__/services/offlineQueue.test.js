import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';

// Mock the reminders side-effects so the queue logic is tested in isolation.
jest.mock('../../services/reminders', () => ({
  scheduleDeadlineReminders: jest.fn(() => Promise.resolve({})),
  scheduleExamReminders: jest.fn(() => Promise.resolve({})),
  cancelDeadlineReminders: jest.fn(() => Promise.resolve()),
  cancelExamReminders: jest.fn(() => Promise.resolve()),
}));

// Mock the store so we can observe the size/error setters.
const mockStoreState = {
  isOffline: false,
  setOfflineQueueSize: jest.fn(),
  setOfflineQueueDrainError: jest.fn(),
};
jest.mock('../../store/useStore', () => ({
  __esModule: true,
  default: { getState: () => mockStoreState },
}));

import * as reminders from '../../services/reminders';
import {
  enqueueOfflineOp,
  drainOfflineQueue,
  initOfflineQueue,
} from '../../services/offlineQueue';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockStoreState.isOffline = false;
});

describe('enqueueOfflineOp', () => {
  it('persists the op and reports the new queue size', async () => {
    enqueueOfflineOp('CANCEL_EXAM_REMINDERS', { courseId: 'c1' });

    expect(mockStoreState.setOfflineQueueSize).toHaveBeenLastCalledWith(1);
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    const queued = JSON.parse(raw);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ type: 'CANCEL_EXAM_REMINDERS', payload: { courseId: 'c1' } });
  });
});

describe('drainOfflineQueue', () => {
  it('executes queued ops and empties the queue on success', async () => {
    enqueueOfflineOp('SCHEDULE_DEADLINE_REMINDERS', { deadline: { id: 'd1' } });
    enqueueOfflineOp('CANCEL_DEADLINE_REMINDERS', { deadlineId: 'd2' });

    await drainOfflineQueue();

    expect(reminders.scheduleDeadlineReminders).toHaveBeenCalledWith({ id: 'd1' });
    expect(reminders.cancelDeadlineReminders).toHaveBeenCalledWith('d2');
    expect(mockStoreState.setOfflineQueueSize).toHaveBeenLastCalledWith(0);
    expect(mockStoreState.setOfflineQueueDrainError).toHaveBeenLastCalledWith(null);

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    expect(JSON.parse(raw)).toEqual([]);
  });

  it('re-queues a failed op and records a drain error', async () => {
    reminders.scheduleExamReminders.mockRejectedValueOnce(new Error('scheduling failed'));
    enqueueOfflineOp('SCHEDULE_EXAM_REMINDERS', { plan: { courseId: 'c9' } });

    await drainOfflineQueue();

    expect(mockStoreState.setOfflineQueueDrainError).toHaveBeenLastCalledWith(
      expect.stringContaining('failed')
    );
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    expect(JSON.parse(raw)).toHaveLength(1); // re-queued
  });

  it('discards unknown op types without error', async () => {
    enqueueOfflineOp('SOMETHING_UNKNOWN', {});
    await drainOfflineQueue();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    expect(JSON.parse(raw)).toEqual([]);
  });

  it('is a no-op when the queue is empty', async () => {
    await drainOfflineQueue();
    expect(reminders.scheduleDeadlineReminders).not.toHaveBeenCalled();
  });
});

describe('initOfflineQueue', () => {
  it('restores a persisted queue and drains it when online', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.OFFLINE_QUEUE,
      JSON.stringify([
        { id: 'op1', type: 'CANCEL_EXAM_REMINDERS', payload: { courseId: 'c1' }, queuedAt: 'x' },
      ])
    );

    await initOfflineQueue();
    // give the fire-and-forget drain a tick to run
    await new Promise((r) => setTimeout(r, 0));

    expect(reminders.cancelExamReminders).toHaveBeenCalledWith('c1');
  });
});
