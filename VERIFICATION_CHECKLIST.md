# Error Handling & Analytics Verification Checklist

## Before Rebuilding

- [ ] Reviewed all changes in `App.js`
- [ ] Reviewed all changes in `services/api.js`
- [ ] Reviewed all changes in `services/bootstrap.js`
- [ ] Reviewed `services/logger.js` (new file)
- [ ] Reviewed `components/ErrorOverlay.js` (new file)
- [ ] Reviewed `screens/debug/DebugScreen.js` (new file)

---

## Building & Installation

### Step 1: Commit Changes

```bash
cd /Users/prashantsharma/Documents/ucb

# Check what will be committed
git status

# Should see these files modified:
#   App.js
#   services/api.js
#   services/bootstrap.js
# And these new:
#   services/logger.js
#   components/ErrorOverlay.js
#   screens/debug/DebugScreen.js
#   DEBUG_BUILD_ISSUES.md
#   REBUILD_AND_TEST.md
#   ERROR_HANDLING_AND_LOGGING.md
#   ANALYTICS_AND_KPI_GUIDE.md
#   VERIFICATION_CHECKLIST.md

# Commit
git add -A
git commit -m "feat: comprehensive error handling, logging, and analytics

- Add centralized logger service with console, persistence, and analytics
- Add ErrorOverlay component to display errors to users
- Add in-app debug screen for viewing logs and statistics
- Improve error handling in App.js, api.js, bootstrap.js
- Add comprehensive analytics and KPI tracking documentation
- Add error handling best practices guide
- All errors now logged and tracked, no silent failures"
```

### Step 2: Build APK

```bash
# Preview profile (for testing)
eas build --platform android --profile preview

# (Takes 5-10 minutes)
# Copy the download link from the output
```

### Step 3: Install APK

```bash
# Connect device via USB with USB Debug enabled
adb devices  # Should show your device

# Install
eas build --platform android --profile preview --wait
# Then follow the download instructions
```

---

## Testing: Error Handling & Logging

### Test 1: App Startup

**What to verify:**
- ✅ Login screen appears
- ✅ Console shows: `[App] Application starting`
- ✅ Console shows: `[Logger] Logger initialized`
- ✅ Console shows: `[Bootstrap] Starting...`
- ✅ Console shows: `[Bootstrap] Complete`

**Run command:**
```bash
adb logcat | grep -E "\[App\]|\[Logger\]|\[Bootstrap\]"
```

**Expected output:**
```
[10:30:15.234] 🟢 [App] Application starting
[10:30:15.456] 🟢 [Logger] Logger initialized
[10:30:16.100] 🟢 [App] Language initialized
[10:30:17.100] 🟢 [Bootstrap] Starting...
[10:30:17.200] 🟢 [Courses] Courses loaded
[10:30:18.000] 🟢 [Bootstrap] Complete. Courses: 12 Events: 45
```

### Test 2: Login with Valid Credentials

**What to verify:**
- ✅ Login successful
- ✅ Redirects to Home screen
- ✅ Console shows: `[API] Response 200 for /users/me`
- ✅ Console shows: `[Bootstrap] Complete`

**Run:**
1. Open app
2. Log in with your Stud.IP username/password
3. Check logs: `adb logcat | grep -E "\[API\]|\[Bootstrap\]"`

### Test 3: Error Handling - Network Error

**What to verify:**
- ✅ Error overlay shows on screen
- ✅ Error message explains the issue
- ✅ Retry button is present
- ✅ Console shows error logs

**How to trigger:**
1. Turn off WiFi/cellular
2. Force refresh (pull down)
3. Watch for error overlay

**Check logs:**
```bash
adb logcat | grep -E "ERROR|Network|NO_INTERNET"
```

### Test 4: Error Handling - Invalid Credentials

**What to verify:**
- ✅ Login fails with error message
- ✅ Error overlay shows (if auto-login fails)
- ✅ Can retry login
- ✅ Console shows: `AUTH_FAILED` error type

**How to trigger:**
1. Clear app data: `adb shell pm clear app.ucbnavigator`
2. Open app
3. Enter wrong password
4. Try to login

**Expected log:**
```
[XX:XX:XX.XXX] ❌ [API] Request failed for /users/me
[XX:XX:XX.XXX] ❌ [Auth] Restore session failed: AUTH_FAILED
```

---

## Testing: Analytics & KPIs

### Test 5: Analytics Events Are Queued

**What to verify:**
- ✅ Events are tracked in memory
- ✅ Events are persisted locally
- ✅ No errors in analytics logging

**How to check:**
```javascript
// In browser console (if debugging with React Native Debugger)
import * as analytics from './services/analytics';
analytics.getLogs?.()  // View queued events
```

**Or check logs:**
```bash
adb logcat | grep -E "trackEvent|session_start|screen_view"
```

### Test 6: Navigation Tracking

**What to verify:**
- ✅ Each screen navigation is logged
- ✅ `screen_view` events for: HomeScreen, TimetableScreen, GuideScreen, etc.

**How to test:**
1. Log in to app
2. Tap through different tabs (Home, Tools, Guide, Map)
3. Navigate to different screens
4. Check logs:

```bash
adb logcat | grep "trackScreen\|screen_view"
```

**Expected**:
```
[10:30:20.000] 🟢 [Analytics] trackScreen: HomeScreen
[10:31:00.000] 🟢 [Analytics] trackScreen: TimetableScreen
[10:31:30.000] 🟢 [Analytics] trackScreen: GuideScreen
```

### Test 7: Session Tracking

**What to verify:**
- ✅ `session_start` logged when app opens
- ✅ `session_end` logged when app closes (with duration, screens, events)
- ✅ `app_foreground` logged when returning from background

**How to test:**
1. Open app (check logs for `session_start`)
2. Use app for 30 seconds, navigate around
3. Background app (press home button)
4. Check logs for `session_end` with metrics:

```bash
adb logcat | grep -E "session_start|session_end|app_foreground"
```

**Expected**:
```
[10:30:20.000] 🟢 [Analytics] trackEvent: session_start app_open
[10:30:30.000] 🟢 [Analytics] trackEvent: session_end app_close {
  "duration_ms": 10000,
  "screens_viewed": 3,
  "events": 5
}
```

### Test 8: Error Analytics

**What to verify:**
- ✅ Errors are tracked as analytics events
- ✅ Error type is captured
- ✅ Error count increases

**How to trigger:**
1. Turn off network
2. Try to refresh data
3. Check logs for error events:

```bash
adb logcat | grep -E "error.*event|ERROR.*event"
```

### Test 9: Settings Respect Analytics Toggle

**What to verify:**
- ✅ Can toggle analytics in Settings
- ✅ When disabled, no events are tracked
- ✅ When enabled again, events resume

**How to test:**
1. Open Settings
2. Toggle "Share usage data"
3. Observe: with analytics disabled, no `trackEvent` logs appear
4. Toggle back on, logs resume

---

## Supabase Verification

### Test 10: Events Appear in Supabase

**What to verify:**
- ✅ `engagement_events` table has new records
- ✅ Records have correct columns (session_id, event_type, event_name, properties)
- ✅ `properties` jsonb has app_language, ts

**How to check:**

1. Go to [Supabase Console](https://app.supabase.com)
2. Select your project
3. Navigate to SQL Editor
4. Run:

```sql
SELECT * FROM engagement_events
ORDER BY created_at DESC
LIMIT 10;
```

**Expected columns:**
- `session_id` — UUID (changes per cold start)
- `event_type` — 'session_start' | 'session_end' | 'screen_view' | 'feature_use' | 'error'
- `event_name` — specific name like 'app_open', 'HomeScreen', etc.
- `properties` → `{app_language: 'en', ts: '2026-06-03T...', ...}`
- `platform` — 'android' | 'ios'
- `app_version` — '1.0.0'
- `created_at` — timestamp

### Test 11: Query Basic Metrics

**Daily Active Users:**
```sql
SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as users
FROM engagement_events
WHERE event_name = 'app_open'
GROUP BY date
ORDER BY date DESC;
```

**Most Viewed Screens:**
```sql
SELECT event_name, COUNT(*) as views
FROM engagement_events
WHERE event_type = 'screen_view'
GROUP BY event_name
ORDER BY views DESC;
```

**Error Rate:**
```sql
SELECT properties->>'errorType' as type, COUNT(*) as count
FROM engagement_events
WHERE event_type = 'error'
GROUP BY type
ORDER BY count DESC;
```

---

## Local Development Testing

### Test 12: Test in Expo Go First (Optional)

Before building APK, test locally:

```bash
npm start  # expo start --go

# Scan QR code with Expo Go on phone
# Log in and navigate around
# Watch terminal for logs
```

**Expected logs in terminal:**
```
[App] Application starting
[Logger] Logger initialized
[API] GET /users/me
[Bootstrap] Starting...
```

---

## Issue Resolution Guide

### Issue: App Shows Blank Screen

**Verification steps:**
1. Check logs: `adb logcat | grep -E "ERROR|error|Error"`
2. Look for error type in logs
3. Check ErrorOverlay appears (dark overlay with error message)
4. Tap "Retry" or "Dismiss"

**If blank screen persists:**
1. Check internet connection
2. Check Stud.IP is accessible: `curl https://studip.hochschule-trier.de`
3. Check credentials are correct
4. Clear app data: `adb shell pm clear app.ucbnavigator`

### Issue: Analytics Not Appearing in Supabase

**Verification steps:**
1. Check `analyticsEnabled` is true in settings
2. Check app is not in development mode (`__DEV__`)
3. Check internet is connected when app closes
4. Build takes ~5-10 minutes, check after that

**If still not appearing:**
1. Check Supabase RLS policies allow inserts from anon
2. Check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in eas.json
3. Check `supabase` client initialization in `services/supabase.js`

### Issue: Logs Not Persisting

**Verification steps:**
1. Check AsyncStorage is working: `adb shell dumpsys | grep AsyncStorage`
2. Check device storage isn't full: `adb shell df`
3. Restart app and check logs again

---

## Production Checklist

Before releasing to users:

- [ ] All error paths logged
- [ ] Error overlay tested with various error types
- [ ] Analytics events verified in Supabase
- [ ] Documentation complete (this file, guides, etc.)
- [ ] Error rate monitored (should be < 5%)
- [ ] No console errors remain
- [ ] Analytics consent modal tested
- [ ] Privacy policy updated (if needed)
- [ ] Settings toggle for analytics works

---

## Monitoring After Release

### Daily Checks

```sql
-- Error rate spike?
SELECT COUNT(*) as errors, DATE(created_at) as date
FROM engagement_events
WHERE event_type = 'error'
GROUP BY date
ORDER BY date DESC;

-- Most common errors
SELECT properties->>'errorType', COUNT(*) as count
FROM engagement_events
WHERE event_type = 'error'
GROUP BY properties->>'errorType'
ORDER BY count DESC;
```

### Weekly Review

1. Check error rate (should be < 5%)
2. Identify top 3 error types
3. Review and fix high-frequency errors
4. Monitor engagement metrics (DAU, session duration, etc.)
5. Check feature adoption (which screens, features used most)

---

## Quick Reference: Commands

```bash
# View live logs
adb logcat | grep -E "\[App\]|\[API\]|\[Bootstrap\]|\[Error\]"

# Save logs to file
adb logcat > logs.txt

# Search logs for errors
grep -i "error\|failed\|exception" logs.txt

# Clear app data
adb shell pm clear app.ucbnavigator

# Check device storage
adb shell df

# View connected devices
adb devices

# Uninstall app
adb uninstall app.ucbnavigator
```

---

## Support & Debugging

### For Users
- Error message shown on screen
- "Retry" button available
- Privacy policy link in Settings
- "Share usage data" toggle in Settings

### For Developers
- Console logs with timestamps and source
- In-app debug screen with log filtering and export
- Supabase queries for analytics review
- Persistent log storage (last 50 logs)
- Error classification system

### For Admins
- Supabase dashboard for metrics
- SQL queries for deep analysis
- User behavior insights from analytics
- Error tracking and monitoring

---

**Last Updated**: 2026-06-03
**App Version**: 1.0.0
**Status**: ✅ Comprehensive error handling & analytics implemented
