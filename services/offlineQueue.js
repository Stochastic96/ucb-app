import AsyncStorage from '@react-native-async-storage/async-storage';
import useStore from '../store/useStore';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  scheduleDeadlineReminders,
  scheduleExamReminders,
  cancelDeadlineReminders,
  cancelExamReminders,
} from './reminders';

const MAX_QUEUE = 50;

let _queue = [];
let _draining = false;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function persistQueue() {
  AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(_queue)).catch(() => {});
  useStore.getState().setOfflineQueueSize(_queue.length);
}

export async function initOfflineQueue() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _queue = parsed;
        useStore.getState().setOfflineQueueSize(_queue.length);
      }
    }
  } catch {}

  // If already online when restoring (cold start with connectivity),
  // drain immediately to avoid stranded operations.
  if (_queue.length > 0 && !useStore.getState().isOffline) {
    drainOfflineQueue().catch(() => {});
  }
}

export function enqueueOfflineOp(type, payload) {
  _queue.push({ id: uid(), type, payload, queuedAt: new Date().toISOString() });
  if (_queue.length > MAX_QUEUE) _queue = _queue.slice(-MAX_QUEUE);
  persistQueue();
}

export async function drainOfflineQueue() {
  if (_draining || _queue.length === 0) return;
  _draining = true;
  const batch = [..._queue];
  _queue = [];
  persistQueue();

  const failed = [];
  for (const op of batch) {
    try {
      await _executeOp(op);
    } catch {
      failed.push(op);
    }
  }

  if (failed.length > 0) {
    _queue = [...failed, ..._queue].slice(0, MAX_QUEUE);
    persistQueue();
  }
  _draining = false;
}

async function _executeOp(op) {
  switch (op.type) {
    case 'SCHEDULE_DEADLINE_REMINDERS':
      await scheduleDeadlineReminders(op.payload.deadline);
      break;
    case 'SCHEDULE_EXAM_REMINDERS':
      await scheduleExamReminders(op.payload.plan);
      break;
    case 'CANCEL_DEADLINE_REMINDERS':
      await cancelDeadlineReminders(op.payload.deadlineId);
      break;
    case 'CANCEL_EXAM_REMINDERS':
      await cancelExamReminders(op.payload.courseId);
      break;
    default:
      // Unknown op type — discard silently
      break;
  }
}
