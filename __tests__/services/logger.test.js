import * as logger from '../../services/logger';

// Logger buffers logs until initLogger() flips _isInitialized. Initialise once
// so subsequent log() calls land in the in-memory ring buffer we assert on.
beforeAll(async () => {
  await logger.initLogger();
});

beforeEach(() => {
  logger.clearLogs();
});

describe('log capture by level', () => {
  it('records info/warn/error entries with source + message', () => {
    logger.info('Auth', 'signed in', { userId: 'u1' });
    logger.warn('API', 'slow response');
    logger.error('Bootstrap', 'load failed');

    expect(logger.getLogs()).toHaveLength(3);
    expect(logger.getLogsByLevel('INFO')[0]).toMatchObject({ source: 'Auth', message: 'signed in' });
    expect(logger.getLogsBySource('API')).toHaveLength(1);
  });
});

describe('error() overloaded signatures', () => {
  it('captures an Error object as the error field', () => {
    logger.error('X', 'boom', new Error('explode'));
    const entry = logger.getLogsByLevel('ERROR')[0];
    expect(entry.errorMessage).toBe('explode');
  });

  it('treats a plain context object (no type/code/message) as data, not error', () => {
    logger.error('X', 'with context', { count: 5 });
    const entry = logger.getLogsByLevel('ERROR')[0];
    expect(entry.data).toEqual({ count: 5 });
    expect(entry.errorMessage).toBeNull();
  });

  it('captures a classified error object (has a type field)', () => {
    logger.error('API', 'request failed', { type: 'NO_INTERNET', message: 'offline' });
    const entry = logger.getLogsByLevel('ERROR')[0];
    expect(entry.errorType).toBe('NO_INTERNET');
  });
});

describe('getStats', () => {
  it('aggregates counts by level and source and lists errors', () => {
    logger.info('A', 'one');
    logger.error('A', 'two');
    logger.warn('B', 'three');

    const stats = logger.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byLevel.INFO).toBe(1);
    expect(stats.byLevel.ERROR).toBe(1);
    expect(stats.bySource.A).toBe(2);
    expect(stats.errors).toHaveLength(1);
    expect(stats.errors[0]).toMatchObject({ source: 'A', message: 'two' });
  });
});

describe('getRecentLogs', () => {
  it('returns the most recent entries first', () => {
    logger.info('S', 'first');
    logger.info('S', 'second');
    const recent = logger.getRecentLogs(1);
    expect(recent).toHaveLength(1);
    expect(recent[0].message).toBe('second');
  });
});
