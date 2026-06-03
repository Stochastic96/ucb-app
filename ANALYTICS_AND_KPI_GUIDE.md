# Analytics & KPI Tracking Guide

## Overview

The UCB Navigator app tracks **anonymous engagement metrics** to understand user behavior and app health. All data is:
- ✅ **Anonymous**: No personal identifiable information
- ✅ **Optional**: Users can opt-out in Settings
- ✅ **Privacy-Compliant**: Disclosed in Datenschutz (Privacy Policy)
- ✅ **Secure**: Stored in Supabase with row-level security (RLS)

---

## How It Works

### Session Lifecycle

```
App Opens
  ↓
startSession() — creates random SESSION_ID (never persisted)
  ↓
trackEvent('session_start', 'app_open')
  ↓
[User navigates, interacts with app]
  ↓
App Goes Background
  ↓
endSession() — tracks duration, screens viewed, event count
  ↓
App Returns to Foreground
  ↓
resumeSession() — starts fresh foreground span
```

### Data Storage

**Supabase table**: `engagement_events`

**Columns**:
- `session_id` — random UUID per cold start (anonymous)
- `event_type` — 'session_start' | 'session_end' | 'screen_view' | 'feature_use' | 'error'
- `event_name` — specific event name (e.g., 'home_screen', 'deadline_added')
- `properties` — jsonb object with event-specific data
- `platform` — 'ios' | 'android'
- `app_version` — '1.0.0'
- `created_at` — auto-generated timestamp

**Per-Event Extra Data** (in `properties`):
- `app_language` — 'en' | 'de'
- `ts` — ISO timestamp
- For `session_end`: `duration_ms`, `screens_viewed`, `events`

---

## Tracked Events

### 1. Session Events

#### `session_start` → `app_open`
**When**: User opens the app
**Properties**:
```json
{
  "app_language": "en",
  "ts": "2026-06-03T10:30:00.000Z"
}
```
**KPI**: Daily/weekly active users (DAU/WAU)

#### `session_start` → `app_foreground`
**When**: App returns from background
**Properties**: (same as above)
**KPI**: Session resumption rate, engagement depth

#### `session_end` → `app_close`
**When**: App goes to background or is closed
**Properties**:
```json
{
  "duration_ms": 180000,
  "screens_viewed": 5,
  "events": 12,
  "app_language": "en"
}
```
**KPIs**:
- `duration_ms` — Average session duration
- `screens_viewed` — Content depth per session
- `events` — Feature usage frequency

---

### 2. Navigation Events

#### `screen_view`
**When**: User navigates to a screen (via `useFocusEffect` or mount)
**Event Name Examples**:
- `HomeScreen`
- `TimetableScreen`
- `MensaScreen`
- `GuideScreen`
- `CourseDetailScreen`
- `EventsScreen`

**Properties**:
```json
{
  "app_language": "en",
  "ts": "2026-06-03T10:32:00.000Z"
}
```

**KPIs**:
- Screen popularity
- User journey (which screens follow which)
- Feature discovery (e.g., how many reach the Guide screen?)

---

### 3. Feature Usage Events

#### `feature_use` → `map_building_opened`
**When**: User opens a building detail in the Map
**Properties**:
```json
{
  "building_id": "9924",
  "building_name": "Studienservice"
}
```
**KPI**: Campus map engagement

#### `feature_use` → `guide_category_opened`
**When**: User opens a guide category
**Properties**:
```json
{
  "category": "accommodation"
}
```
**KPI**: Guide content popularity (which topics are most read?)

#### `feature_use` → `deadline_added`
**When**: User creates a new deadline
**Properties**:
```json
{
  "date": "2026-06-15"
}
```
**KPI**: Planner adoption, user planning behavior

#### `feature_use` → `news_item_opened`
**When**: User opens a news article
**Properties**:
```json
{
  "source": "stud.ip"
}
```
**KPI**: News engagement, information-seeking behavior

#### `feature_use` → `notification_scheduled`
**When**: User enables notifications
**Properties**:
```json
{
  "type": "event"  // 'event' | 'sport' | 'deadline' | 'exam'
}
```
**KPI**: Notification adoption by type

---

### 4. Error Events

#### `error` → `{source}_error`
**When**: Any error occurs in the app
**Examples**:
- `Auth_error` — Login failed
- `API_error` — Network request failed
- `Bootstrap_error` — Data loading failed

**Properties**:
```json
{
  "message": "Unable to load courses",
  "errorType": "NO_INTERNET",
  "errorMessage": "Network request failed"
}
```

**KPI**: Error rate by type, app stability

---

## How to Query Analytics

### Via Supabase Console

```sql
-- Daily active users
SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as users
FROM engagement_events
WHERE event_name = 'app_open'
GROUP BY date
ORDER BY date DESC;

-- Most viewed screens
SELECT event_name, COUNT(*) as views
FROM engagement_events
WHERE event_type = 'screen_view'
GROUP BY event_name
ORDER BY views DESC;

-- Average session duration
SELECT 
  AVG((properties->>'duration_ms')::int) / 1000 as avg_duration_sec,
  DATE(created_at) as date
FROM engagement_events
WHERE event_name = 'app_close'
GROUP BY date
ORDER BY date DESC;

-- Error rate
SELECT 
  properties->>'errorType' as error_type,
  COUNT(*) as count
FROM engagement_events
WHERE event_type = 'error'
GROUP BY error_type
ORDER BY count DESC;

-- Feature popularity (deadlines added)
SELECT DATE(created_at) as date, COUNT(*) as deadlines_added
FROM engagement_events
WHERE event_name = 'deadline_added'
GROUP BY date;
```

---

## Opt-Out / Privacy Controls

### How Users Control Analytics

1. **Open Settings** → Privacy
2. **Toggle** "Share usage data with developers"
3. **Settings saved** to AsyncStorage `ucb_settings`
4. **`analyticsEnabled` flag** checked before every event

### Code Implementation

```javascript
// In services/analytics.js
function isAnalyticsEnabled() {
  if (__DEV__) return false;  // Never in dev
  const { settings } = useStore.getState();
  return settings.analyticsEnabled !== false;  // default true
}

// Every event respects this:
export function trackEvent(type, name, properties = {}) {
  if (!isAnalyticsEnabled()) return;  // Silent no-op
  // ... rest of tracking
}
```

### Privacy Disclosure

Users are shown:
1. **AnalyticsConsentModal** on first app launch
2. **Privacy Policy** with full disclosure of what's tracked
3. **Settings toggle** to enable/disable anytime

See: `screens/legal/PrivacyPolicyScreen.js`

---

## Key Performance Indicators (KPIs)

### Engagement KPIs

| KPI | Query | Target | How to Improve |
|-----|-------|--------|----------------|
| DAU (Daily Active Users) | Count distinct `session_id` per day | ↑ Growth | Onboarding, feature discovery |
| Session Duration | Avg `duration_ms` per session | ↑ 5+ min | Engaging content, better UX |
| Screens per Session | Avg `screens_viewed` | ↑ 3+ screens | Content discovery, navigation |
| Return Rate | DAU ÷ new users × 100 | ↑ 50%+ | Retention, notification reminders |
| Feature Usage | `feature_use` events | ↑ Usage breadth | Feature visibility, tutorials |

### Feature Adoption KPIs

| Feature | Metric | How to Track |
|---------|--------|-------------|
| Timetable | `screen_view` count | % users who view schedule |
| Deadline Planner | `deadline_added` events | % users who create deadlines |
| Mensa Menu | `screen_view` MensaScreen | % users checking meals |
| Campus Map | `map_building_opened` | Building popularity |
| Notifications | `notification_scheduled` | % opting into alerts |

### Health KPIs

| Metric | How to Track | Action if Bad |
|--------|-------------|--------------|
| Error Rate | Count `error` events | Debug, fix bugs |
| Bootstrap Success | `bootstrap_success` vs `bootstrap_error` | Improve data loading |
| App Crashes | Unexpected `session_end` without events | Stabilize app |

---

## Debugging with Logs

### View In-App Debug Logs

The app stores the last 50 logs in memory. To view:
1. (Admin only) Access `DebugScreen` (see `screens/debug/DebugScreen.js`)
2. View all logs with filtering by level (INFO, WARN, ERROR)
3. Export logs for sharing

### Console Logs (Development)

All critical events are logged to console with format:
```
[HH:MM:SS.mmm] 🟢 [SourceModule] Message
```

**Examples**:
```
[10:30:15.234] 🟢 [App] Application starting
[10:30:15.456] 🟢 [Logger] Logger initialized
[10:30:16.100] 🔍 [API] GET /users/me
[10:30:16.500] 🟢 [Bootstrap] Profile loaded
[10:30:17.200] 🟢 [Bootstrap] Complete. Courses: 12 Events: 45
```

---

## Adding New Analytics Events

### Example: Track a New Feature

1. **Identify the feature** (e.g., "user bookmarks an event")
2. **Choose event type**: `'feature_use'`
3. **Add tracking code**:

```javascript
// In EventsScreen.js or wherever the action happens
import { trackEvent } from '../services/analytics';

const handleBookmark = async (eventId) => {
  // ... bookmark logic ...
  
  // Track the action
  trackEvent('feature_use', 'event_bookmarked', {
    eventId,
    courseId: event.courseId,
  });
};
```

4. **Update this guide** to document the new event
5. **Verify** in Supabase that the event appears

### Event Naming Convention

- `feature_use` → `<action>_<object>` (e.g., `event_bookmarked`)
- `screen_view` → `<ScreenName>` (e.g., `EventsScreen`)
- `error` → `<source>_error` (auto-generated)

---

## Analytics Settings & Toggles

### In-App Setting

```javascript
// Store
settings: {
  analyticsEnabled: true,  // default true
  notificationsEnabled: false,
  biometricLockEnabled: false,
}

// User changes via SettingsScreen
updateSettings({ analyticsEnabled: false })
// → Saved to AsyncStorage 'ucb_settings'
```

### Server-Side Supabase RLS

```sql
-- engagement_events table
INSERT: Allow only authenticated users with admin role
SELECT: Allow only admin users
UPDATE: Allow only admin users
DELETE: Allow only admin users

-- Exception: anon can INSERT (via app)
```

---

## Common Questions

### Q: Is personal data tracked?
**A**: No. `session_id` is random and never persisted or linked to user accounts.

### Q: Can users see what's tracked?
**A**: Yes. Full disclosure in `PrivacyPolicyScreen.js`.

### Q: How long is data kept?
**A**: Indefinite (depends on Supabase plan). Users can request deletion via DSGVO Art. 17.

### Q: What about offline usage?
**A**: Events queue locally and flush when online (via `ucb_analytics_q` in AsyncStorage).

### Q: Can I disable analytics in development?
**A**: Yes, automatically. Check: `if (__DEV__) return false;`

---

## Next Steps

1. ✅ Enable analytics consent modal on app launch
2. ✅ Test analytics by installing a build and monitoring events
3. ✅ Set up Supabase dashboard to visualize key metrics
4. ✅ Document any custom events you add
5. ✅ Review error events weekly and fix reported issues
