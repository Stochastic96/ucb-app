# Error Handling & Logging Guide

## Overview

This guide explains the comprehensive error handling and logging system added to UCB Navigator to help you debug issues quickly.

**Key Goals:**
- ✅ No silent failures — all errors are logged
- ✅ User-friendly error messages — users see what went wrong
- ✅ Developer debugging — console and in-app logs for troubleshooting
- ✅ Analytics tracking — error rates and types sent to Supabase
- ✅ Persistent history — last 50 logs stored locally

---

## The Logging Service

### Location
`services/logger.js` — Centralized logging with console, persistence, and analytics integration

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **INFO** | General informational messages | "User loaded" |
| **DEBUG** | Detailed debug info (dev only) | "API request sent" |
| **WARN** | Non-critical issues | "Slow response (5s)" |
| **ERROR** | Failures that need attention | "Network unreachable" |

### How to Use

```javascript
import * as logger from '../services/logger';

// Info
logger.info('Auth', 'User logged in', { userId: '123' });

// Debug (only in dev)
logger.debug('API', 'Request payload', { url: '/courses', method: 'GET' });

// Warn
logger.warn('API', 'Slow response', { duration: 5000 });

// Error
logger.error('Bootstrap', 'Failed to load courses', err, { courseCount: 0 });
```

---

## Error Handling Patterns

### Pattern 1: Try-Catch with Logger

```javascript
// services/courses.js
export async function fetchCourses(userId, force) {
  try {
    logger.info('Courses', 'Fetching courses', { userId, force });
    const client = await getApiClient();
    const response = await client.get(`/users/${userId}/course-memberships`);
    logger.info('Courses', 'Courses loaded', { count: response.data.length });
    return response.data;
  } catch (err) {
    const classified = classifyError(err);
    logger.error('Courses', 'Failed to fetch courses', err, { type: classified.type });
    throw classified;
  }
}
```

### Pattern 2: Fallback on Error

```javascript
// services/events.js
async function fetchEventsForCourse(course, client, forceRefresh) {
  try {
    const response = await client.get(`/courses/${course.id}/events`);
    logger.info('Events', 'Events loaded', { courseId: course.id, count: response.data.length });
    return response.data;
  } catch (err) {
    const classified = classifyError(err);
    logger.warn('Events', 'Failed to load events, trying cache', { courseId: course.id, type: classified.type });
    
    // Try fallback
    if (classified.type === 'NO_INTERNET') {
      const stale = await getStaleCacheData(`events_${course.id}`);
      if (stale) {
        logger.info('Events', 'Using stale cache', { courseId: course.id });
        return stale.data;
      }
    }
    
    logger.error('Events', 'No data available (no cache, no network)', err);
    return [];
  }
}
```

### Pattern 3: Error Overlay (User Feedback)

```javascript
// App.js
const [displayError, setDisplayError] = useState(null);

const handleError = (err) => {
  const message = err?.message || 'Something went wrong';
  logger.error('App', 'Caught error', err);
  setDisplayError(message);
};

// In JSX
{displayError && (
  <ErrorOverlay
    error={displayError}
    onDismiss={() => setDisplayError(null)}
    onRetry={handleError}
  />
)}
```

---

## Error Classification

### API Error Classification (`services/api.js`)

The `classifyError()` function categorizes errors:

```javascript
// Returns: { type, message }

classifyError(err) {
  if (err.response?.status === 401) {
    return { type: 'AUTH_FAILED', message: 'Session expired' };
  }
  if (err.response?.status === 429) {
    return { type: 'RATE_LIMITED', message: 'Too many requests' };
  }
  if (err.response?.status >= 500) {
    return { type: 'SERVER_DOWN', message: 'Server unavailable' };
  }
  if (err.name === 'AbortError' || err.message === 'Network request failed') {
    return { type: 'NO_INTERNET', message: 'Check connection' };
  }
  return { type: 'UNKNOWN', message: err.message };
}
```

### Error Types

| Type | Cause | User Message | Action |
|------|-------|--------------|--------|
| `AUTH_FAILED` | 401/403 response | "Session expired" | Show login screen |
| `RATE_LIMITED` | 429 response | "Too many requests" | Show retry button |
| `SERVER_DOWN` | 5xx response | "Server unavailable" | Retry later |
| `NO_INTERNET` | Network error | "Check connection" | Retry when online |
| `NO_CREDENTIALS` | No stored login | "Please log in" | Show login screen |
| `UNKNOWN` | Other | Generic error msg | Show error overlay |

---

## Console Logging

### Format

All logs follow this format:
```
[HH:MM:SS.mmm] icon [Source] Message
```

**Icons:**
- 🟢 `INFO` — normal operation
- 🔍 `DEBUG` — detailed debug info
- ⚠️ `WARN` — something unexpected
- ❌ `ERROR` — failure

### Examples

```
[10:30:15.234] 🟢 [App] Application starting
[10:30:15.456] 🟢 [Logger] Logger initialized
[10:30:16.100] 🔍 [API] GET /users/me
[10:30:16.500] 🟢 [API] Response 200 for /users/me
[10:30:17.100] 🟢 [Bootstrap] Starting...
[10:30:17.200] 🟢 [Courses] Courses loaded {"count": 12}
[10:30:18.000] 🟢 [Bootstrap] Complete. Courses: 12 Events: 45
[10:31:00.000] ❌ [API] Request failed for /courses/ABC/events
[10:31:00.100] ❌ [API] Request timeout for /courses/ABC/events
[10:31:00.200] ⚠️ [Events] Failed to load events, trying cache
```

### Viewing Console Logs

**In Expo Go / Development:**
```bash
npm start
# Logs appear in terminal where you ran npm start
```

**In Built APK (via ADB):**
```bash
adb logcat | grep -E "\[App\]|\[API\]|\[Bootstrap\]|\[Courses\]|\[Events\]"
```

---

## In-App Debug Screen

### Access Debug Logs

1. **Navigate to Settings** (in app)
2. **Look for "Debug Logs"** option (if enabled)
3. **View all logs** with filtering and search
4. **Export logs** for sharing with developers

### Features

- Filter by level (INFO, WARN, ERROR)
- View log details (data, error stack, etc.)
- Export as JSON
- Clear old logs
- Real-time refresh

### Using DebugScreen

```javascript
// Add to RootNavigator if needed:
<Stack.Screen
  name="Debug"
  component={DebugScreen}
  options={{ headerShown: true, title: 'Debug Logs' }}
/>

// Programmatically navigate:
navigation.navigate('Debug');
```

---

## Error Handling Checklist

### For Every Service Function

```javascript
export async function myServiceFunction(params) {
  try {
    // 1. Log entry
    logger.info('MyService', 'Starting operation', { params });
    
    // 2. Do work
    const result = await someAsyncWork();
    
    // 3. Log success
    logger.info('MyService', 'Operation complete', { resultCount: result.length });
    
    return result;
  } catch (err) {
    // 4. Classify error
    const classified = classifyError(err);
    
    // 5. Log error with context
    logger.error('MyService', 'Operation failed', err, { 
      type: classified.type,
      params 
    });
    
    // 6. Return fallback or throw
    return fallbackValue; // OR throw classified;
  }
}
```

### For Every Screen

```javascript
useEffect(() => {
  // 1. Log mount
  logger.info('MyScreen', 'Screen mounted');
  
  // 2. Load data with error handling
  loadData()
    .then((data) => {
      logger.info('MyScreen', 'Data loaded', { count: data.length });
      setData(data);
    })
    .catch((err) => {
      logger.error('MyScreen', 'Failed to load data', err);
      setError(err?.message || 'Failed to load');
    });
}, []);
```

---

## Monitoring Error Rates

### Query Errors by Type

```sql
-- Supabase: Check engagement_events table
SELECT 
  properties->>'errorType' as type,
  COUNT(*) as count,
  DATE(created_at) as date
FROM engagement_events
WHERE event_type = 'error'
GROUP BY date, type
ORDER BY date DESC, count DESC;
```

### Alert Conditions

Set up alerts if:
- Error rate > 10% of sessions
- Same error type appears > 50 times per day
- `BOOTSTRAP_ERROR` spike (data loading failing)
- `NO_INTERNET` surge (network issues affecting users)

---

## Common Errors & Solutions

### Error: "Network request failed"

**Type**: `NO_INTERNET`

**Causes**:
- No internet connection
- Firewall blocking Stud.IP
- DNS resolution failing

**Debug**:
```bash
# Check if Stud.IP is reachable
curl https://studip.hochschule-trier.de/jsonapi.php/v1

# Check device network
adb shell ifconfig
```

**Solution**:
- Check WiFi/mobile connection
- Check Stud.IP is accessible
- Check environment variables in build

### Error: "Session expired"

**Type**: `AUTH_FAILED`

**Causes**:
- Credentials invalid
- Credentials older than 7 days (SESSION_MAX_AGE)
- Server rejecting auth

**Debug**:
```bash
# Check SecureStore has credentials
adb shell 'am shell dumpsys | grep KEYSTORE'

# Manually test auth
curl -u username:password https://studip.hochschule-trier.de/jsonapi.php/v1/users/me
```

**Solution**:
- Re-login with correct credentials
- Clear SecureStore if corrupted
- Check server time sync

### Error: "Bootstrap failed"

**Type**: `BOOTSTRAP_ERROR`

**Causes**:
- Course fetch failed
- Event fetch failed
- News fetch failed
- API rate limited

**Debug**:
- Check logs for which step failed
- Look at network in DevTools
- Check API response codes

**Solution**:
- Retry with backoff
- Check Stud.IP is not rate limiting
- Check network connectivity

---

## Performance Logging

### Track Slow Operations

```javascript
const start = Date.now();
const data = await slowOperation();
const duration = Date.now() - start;

if (duration > 5000) {  // > 5 seconds
  logger.warn('MyService', 'Slow operation', { operation: 'slowOp', duration });
}
```

### Common Slow Operations

| Operation | Warning Threshold | Concern |
|-----------|------------------|---------|
| API call | 5 seconds | Network or server slow |
| Bootstrap | 10 seconds | Too much data |
| Screen render | 2 seconds | UI performance |

---

## Testing Error Handling

### Simulate Network Error

```javascript
// In development, inject error:
const mockError = new Error('Network request failed');
mockError.name = 'AbortError';
throw mockError;
```

### Simulate Auth Failure

```bash
# Clear credentials
adb shell 'am shell dumpsys | grep KEYSTORE' | xargs rm
# Or uninstall and reinstall app
adb uninstall app.ucbnavigator
```

### Simulate Rate Limiting

```bash
# In browser DevTools, throttle network to Slow 3G
# Or use Charles Proxy to inject 429 responses
```

---

## Summary Checklist

- ✅ All try-catch blocks log errors
- ✅ API calls log request/response
- ✅ Bootstrap steps are logged
- ✅ Screen mounts are logged
- ✅ Errors are classified and categorized
- ✅ Users see error messages (not blank screens)
- ✅ Error rates are tracked in analytics
- ✅ Logs are persisted for debugging
- ✅ Error types are documented
- ✅ Slow operations are monitored
