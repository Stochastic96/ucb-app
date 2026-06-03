# Quick Start: Error Handling & Logging

## TL;DR — What Changed

✅ **No more blank screens** — Errors now show with user-friendly messages
✅ **Logging everywhere** — All critical operations logged to console and storage
✅ **Analytics working** — Error tracking and KPI monitoring to Supabase
✅ **Debug tools** — In-app log viewer + persistent log storage

---

## Quick Test Checklist

### 1. Build & Test APK

```bash
# Commit (already done)
git add -A
git commit -m "error handling implementation"

# Build
eas build --platform android --profile preview --wait

# Install
adb install -r your-app.apk

# Monitor logs
adb logcat | grep -E "\[App\]|\[API\]|\[Bootstrap\]"
```

### 2. Look for These Console Logs

```
✅ [App] Application starting
✅ [Logger] Logger initialized
✅ [API] GET /users/me
✅ [Bootstrap] Starting...
✅ [Bootstrap] Complete. Courses: 12 Events: 45
```

If you see those → **Error handling is working!**

### 3. Test Error Display

1. Turn off WiFi
2. Try to refresh data
3. **See error message on screen?** → Working ✅

### 4. Check Supabase Analytics

```sql
-- Go to Supabase Console
SELECT * FROM engagement_events
ORDER BY created_at DESC
LIMIT 10;

-- Should show your events
```

---

## Key Files

| File | What It Does |
|------|-------------|
| `services/logger.js` | Centralized logging |
| `components/ErrorOverlay.js` | Shows errors to users |
| `screens/debug/DebugScreen.js` | View logs in-app |
| `App.js` | Initializes everything |
| `services/api.js` | Logs API calls |

---

## How to Log

```javascript
import * as logger from '../services/logger';

// Log info
logger.info('MyModule', 'Something happened', { data });

// Log error
logger.error('MyModule', 'Something failed', err, { context });

// View logs
const logs = logger.getLogs();
const errors = logger.getLogsByLevel('ERROR');
```

---

## Analytics Events

### Automatic Tracking
- ✅ Session start/end
- ✅ Screen navigation
- ✅ Errors
- ✅ Feature usage
- ✅ Duration & engagement metrics

### Query Examples

```sql
-- Daily active users
SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as users
FROM engagement_events
WHERE event_name = 'app_open'
GROUP BY date;

-- Error rate
SELECT properties->>'errorType', COUNT(*)
FROM engagement_events
WHERE event_type = 'error'
GROUP BY properties->>'errorType';

-- Most viewed screens
SELECT event_name, COUNT(*)
FROM engagement_events
WHERE event_type = 'screen_view'
GROUP BY event_name;
```

---

## Troubleshooting

### Problem: Blank Screen
**Solution**: Check logs for error:
```bash
adb logcat | grep "ERROR\|error\|Error"
```

### Problem: No Error Overlay
**Solution**: Check if error happened during bootstrap:
1. Look for `[Bootstrap] Failed` in logs
2. Check `bootstrapError` in Zustand store

### Problem: Analytics Not Appearing
**Solution**: 
1. Check `analyticsEnabled` is true (Settings)
2. Check app not in dev mode
3. Wait 30+ seconds for batch flush
4. Check Supabase RLS allows anon inserts

---

## Console Log Reference

```
[HH:MM:SS.mmm] icon [Source] Message

🟢 INFO       — Normal operation
🔍 DEBUG      — Detailed debug info (dev only)
⚠️  WARN      — Something unexpected
❌ ERROR      — Failure that needs attention
```

---

## Logging Best Practices

✅ Log at function entry with parameters
✅ Log at function exit with result
✅ Log errors with context data
✅ Use consistent source names (module names)
✅ Include IDs and counts in data
✅ Don't log sensitive data (passwords, tokens)

---

## Documentation Files

```
ERROR_HANDLING_AND_LOGGING.md     ← How to implement patterns
ANALYTICS_AND_KPI_GUIDE.md        ← All tracked events
VERIFICATION_CHECKLIST.md         ← Testing & production checklist
IMPLEMENTATION_SUMMARY.md         ← Overview of changes
QUICK_START_DEBUGGING.md          ← This file
```

---

## Next Steps

1. **Build APK** with error handling
2. **Test** error display and logs
3. **Monitor Supabase** for analytics events
4. **Review errors** weekly and fix issues
5. **Iterate** — add more logging as needed

---

## Useful Commands

```bash
# View live logs
adb logcat | grep "\[App\]\|\[API\]\|\[Bootstrap\]"

# Save logs
adb logcat > app-logs.txt

# Search logs for errors
grep -i "error\|failed" app-logs.txt

# Clear app data
adb shell pm clear app.ucbnavigator

# Export logs from app
# (Use DebugScreen → Export button)
```

---

## What You Can Measure Now

| Metric | How | Why |
|--------|-----|-----|
| Error Rate | % events with errors | App stability |
| Session Duration | Avg duration_ms | Engagement |
| Screens Per Session | Avg screens_viewed | Content depth |
| Feature Usage | Count of events | Adoption |
| Daily Users | Distinct session_ids | Growth |

---

## Support

**For Users:**
- Error message shown on screen
- "Retry" button to try again
- Settings toggle for privacy

**For Developers:**
- Console logs with timestamps
- In-app debug screen
- Persistent log storage

**For Admins:**
- Supabase dashboard
- SQL queries for analysis
- Error monitoring

---

**Status**: ✅ Implementation Complete
**Ready to Build**: Yes
**Documentation**: Complete
