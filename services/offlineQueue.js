import AsyncStorage from '@react-native-async-storage/async-storage';
import useStore from '../store/useStore';
import { STORAGE_KEYS } from '../constants/storageKeys';
import * as logger from './logger';
import {
  scheduleDeadlineReminders,
  scheduleExamReminders,
  cancelDeadlineReminders,
  cancelExamReminders,
} from './reminders';

const MAX_QUEUE = 50;

let _queue = [];
let _draining = false;
let _lastDrainError = null;

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

  try {
    const batch = [..._queue];
    const failed = [];
    for (const op of batch) {
      try {
        await _executeOp(op);
      } catch (err) {
        logger.warn('OfflineQueue', 'Operation failed, re-queuing', { opId: op.id, error: err?.message });
        failed.push(op);
      }
    }

    // Keep failed operations + any new operations that were added concurrently during execution
    const concurrentOps = _queue.filter(qOp => !batch.some(bOp => bOp.id === qOp.id));
    _queue = [...failed, ...concurrentOps].slice(0, MAX_QUEUE);
    persistQueue();

    if (failed.length > 0) {
      const msg = `${failed.length}/${batch.length} operations failed`;
      _lastDrainError = msg;
      useStore.getState().setOfflineQueueDrainError(msg);
    } else {
      _lastDrainError = null;
      useStore.getState().setOfflineQueueDrainError(null);
      logger.info('OfflineQueue', 'Drain complete', { operationCount: batch.length });
    }
  } catch (err) {
    logger.error('OfflineQueue', 'Drain failed with error', err);
    _lastDrainError = err?.message || 'Unknown drain error';
    useStore.getState().setOfflineQueueDrainError(_lastDrainError);
    throw err;
  } finally {
    _draining = false;
  }
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
