import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

// ─────────────────────────────────────────────────────────────────────────
// Centralized Logging Service
//
// All errors and important events go through this service for:
// 1. Console logging with context (timestamp, level, source)
// 2. Persistent log storage (last 50 logs in AsyncStorage)
// 3. Debug screen display
//
// Usage:
//   logger.info('UserScreen', 'User loaded', { userId: '123' })
//   logger.warn('API', 'Slow response', { duration: 5000 })
//   logger.error('Bootstrap', 'Failed to load courses', err)
// ─────────────────────────────────────────────────────────────────────────

const LOG_STORAGE_KEY = STORAGE_KEYS.LOGS;
const MAX_STORED_LOGS = 50;
let _logs = [];
let _isInitialized = false;
let _pendingLogs = [];

export const LogLevel = {
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

function formatTimestamp(date = new Date()) {
  return date.toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function createLogEntry(level, source, message, data, error) {
  return {
    timestamp: new Date().toISOString(),
    displayTime: formatTimestamp(),
    level,
    source,
    message,
    data: data || null,
    errorType: error?.type || error?.code || (typeof error === 'string' ? error : null),
    errorMessage: error?.message || null,
    errorStack: error?.stack || null,
    platform: Platform.OS,
  };
}

async function persistLogs() {
  try {
    const toStore = _logs.slice(-MAX_STORED_LOGS);
    await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Silently fail if storage is full
  }
}

async function restoreLogs() {
  try {
    const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      _logs = [...parsed, ..._pendingLogs].slice(-MAX_STORED_LOGS);
    } else {
      _logs = [..._pendingLogs].slice(-MAX_STORED_LOGS);
    }
  } catch {
    _logs = [..._pendingLogs].slice(-MAX_STORED_LOGS);
  } finally {
    _isInitialized = true;
    _pendingLogs = [];
  }
}

function log(level, source, message, data = null, error = null) {
  const entry = createLogEntry(level, source, message, data, error);
  
  if (!_isInitialized) {
    _pendingLogs.push(entry);
  } else {
    _logs.push(entry);
    if (_logs.length > MAX_STORED_LOGS) {
      _logs = _logs.slice(-MAX_STORED_LOGS);
    }
    persistLogs();
  }

  // Console output with color coding (for dev tools)
  const icon = {
    [LogLevel.INFO]: 'ℹ️',
    [LogLevel.DEBUG]: '🔍',
    [LogLevel.WARN]: '⚠️',
    [LogLevel.ERROR]: '❌',
  }[level] || '•';

  const logFn = {
    [LogLevel.ERROR]: console.error,
    [LogLevel.WARN]: console.warn,
    [LogLevel.DEBUG]: console.debug,
    [LogLevel.INFO]: console.log,
  }[level] || console.log;

  const msg = `[${entry.displayTime}] ${icon} [${source}] ${message}`;

  if (error) {
    logFn(msg, error);
    if (data) logFn('  Data:', data);
  } else if (data) {
    logFn(msg, data);
  } else {
    logFn(msg);
  }
}

/**
 * INFO level: General informational messages
 * @param {string} source - Source module name (e.g., 'Auth', 'API', 'Bootstrap')
 * @param {string} message - Log message
 * @param {object} [data] - Additional data
 */
export function info(source, message, data = null) {
  log(LogLevel.INFO, source, message, data);
}

/**
 * DEBUG level: Detailed debug information
 * @param {string} source - Source module name
 * @param {string} message - Log message
 * @param {object} [data] - Additional data
 */
export function debug(source, message, data = null) {
  if (__DEV__) {
    log(LogLevel.DEBUG, source, message, data);
  }
}

/**
 * WARN level: Warning messages (non-critical issues)
 * @param {string} source - Source module name
 * @param {string} message - Log message
 * @param {object} [data] - Additional data
 */
export function warn(source, message, data = null) {
  log(LogLevel.WARN, source, message, data);
}

/**
 * ERROR level: Error messages (failures that need attention)
 * @param {string} source - Source module name
 * @param {string} message - Log message
 * @param {Error|object} [error] - Error object or classified error
 * @param {object} [data] - Additional context data
 */
export function error(source, message, errorOrData = null, data = null) {
  // Handle overloaded signatures:
  // error(source, message)
  // error(source, message, error)
  // error(source, message, data, error)
  let err = null;
  let ctx = null;

  if (errorOrData instanceof Error || (errorOrData && typeof errorOrData === 'object' && (errorOrData.type || errorOrData.code || errorOrData.message))) {
    err = errorOrData;
    ctx = data;
  } else if (errorOrData && typeof errorOrData === 'object') {
    ctx = errorOrData;
  }

  log(LogLevel.ERROR, source, message, ctx, err);
}

/**
 * Get all stored logs
 * @returns {Array<object>} Array of log entries
 */
export function getLogs() {
  return [..._logs];
}

/**
 * Get logs filtered by level
 * @param {string} level - LogLevel constant
 * @returns {Array<object>} Filtered log entries
 */
export function getLogsByLevel(level) {
  return _logs.filter((l) => l.level === level);
}

/**
 * Get logs filtered by source
 * @param {string} source - Source module name
 * @returns {Array<object>} Filtered log entries
 */
export function getLogsBySource(source) {
  return _logs.filter((l) => l.source === source);
}

/**
 * Get recent logs (most recent first)
 * @param {number} count - Number of recent logs to return
 * @returns {Array<object>} Recent log entries
 */
export function getRecentLogs(count = 20) {
  return [..._logs].reverse().slice(0, count);
}

/**
 * Clear all stored logs
 */
export function clearLogs() {
  _logs = [];
  AsyncStorage.removeItem(LOG_STORAGE_KEY).catch(() => {});
}

/**
 * Export logs as JSON string (for sharing/debugging)
 * @returns {string} JSON representation of all logs
 */
export function exportLogs() {
  return JSON.stringify(_logs, null, 2);
}

/**
 * Initialize logger (restore persisted logs)
 * @returns {Promise<void>}
 */
export async function initLogger() {
  await restoreLogs();
  info('Logger', 'Logger initialized', { logCount: _logs.length });
}

/**
 * Get logger stats
 * @returns {object} Statistics about logged events
 */
export function getStats() {
  const stats = {
    total: _logs.length,
    byLevel: {},
    bySource: {},
    errors: [],
  };

  _logs.forEach((log) => {
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
    if (log.level === LogLevel.ERROR) {
      stats.errors.push({
        timestamp: log.displayTime,
        source: log.source,
        message: log.message,
        type: log.errorType,
      });
    }
  });

  return stats;
}

export default {
  LogLevel,
  info,
  debug,
  warn,
  error,
  getLogs,
  getLogsByLevel,
  getLogsBySource,
  getRecentLogs,
  clearLogs,
  exportLogs,
  initLogger,
  getStats,
};
