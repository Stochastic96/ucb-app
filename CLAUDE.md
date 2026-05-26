# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

UCB Navigator is an Expo 54 / React Native app for international students at Hochschule Trier (Germany). It integrates with **Stud.IP** (the university's LMS) via its JSON:API and with **Supabase** for admin-managed content. The app slug is `ucb-navigator`; the actual university is Hochschule Trier, not UC Berkeley — the name is historical.

## Commands

```bash
# Development (Expo Go — no native build needed)
npm start             # expo start --go

# Web (browser, limited native features)
npm run web           # expo start --web

# Native builds (requires Dev Client APK installed on device)
npm run android       # expo run:android
npm run ios           # expo run:ios

# CORS proxy for Stud.IP in local dev (if needed)
npm run proxy         # node scripts/studip-proxy.js  (port 3001)

# EAS cloud builds  (two profiles: development, production)
eas build --platform android --profile development
eas build --platform android --profile production
```

`production` profile uses `autoIncrement: true`. Both profiles share the same three `EXPO_PUBLIC_*` env vars defined in `eas.json`.

There is no test suite or linter configured. The codebase is plain JavaScript (`.js` files throughout); `tsconfig.json` and TypeScript dev dependencies are present but only for editor type-checking support — do not create `.ts`/`.tsx` files.

## Environment Variables

All env vars are prefixed `EXPO_PUBLIC_` and embedded at EAS build time via `eas.json`. For local dev, create a `.env` file:

```
EXPO_PUBLIC_STUDIP_BASE_URL=https://studip.hochschule-trier.de/jsonapi.php/v1
EXPO_PUBLIC_SUPABASE_URL=https://vrnhkwhwoxhcjssqhdat.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<publishable anon key>
```

The Stud.IP base URL can also be swapped to `http://localhost:3001` when running the local proxy.

## Architecture

### Auth & Session Flow

1. `App.js` → on mount, loads persisted settings from AsyncStorage (`ucb_settings`) and calls `services/auth.checkExistingSession()`.
2. `checkExistingSession` reads credentials from `expo-secure-store`, calls Stud.IP `/users/me`, and returns the user profile. Sessions older than `SESSION_MAX_AGE` (7 days, `constants/config.js`) require re-login.
3. On success, `bootstrapSessionData()` (`services/bootstrap.js`) runs a filtering pipeline: fetch profile → fetch all courses → fetch all events for those courses → derive `activeCourseIds` (events within 30 days past / 180 days future) → filter both courses and events to active only → fetch news. Stores results in the Zustand store and sets `isOffline: false`. Concurrent callers share one in-flight bootstrap via a `_inflightBootstrap` deduplication guard — only one `_runBootstrap` runs at a time regardless of how many callers invoke `bootstrapSessionData()` simultaneously.
4. `RootNavigator` gates on `useStore.isLoggedIn` — renders `LoginScreen` or `MainTabs`.

Credentials (username / password) are stored in `expo-secure-store` with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` (prevents iCloud backup/restore to other devices) and also cached in-memory (`services/api.js` `_cachedUsername/_cachedPassword`) to avoid concurrent SecureStore races. Session age is tracked via the `ucb_session_created` SecureStore key.

### State Management

Single Zustand store in `store/useStore.js`. Key slices:
- **Auth**: `isLoggedIn`, `user`, `userId`
- **Data**: `courses`, `events`, `news`, `unreadNewsCount`
- **Session hydration**: `isHydrating`, `dataReady`, `bootstrapError`, `lastSyncAt`
- **Tools**: `deadlines`, `examRegistrations`, `examPlans` (each persisted to a separate AsyncStorage key)
- **Events RSVP**: `goingEventIds`, `goingSportIds`
- **Deep-link**: `pendingMapBuilding` (Timetable → Map navigation)
- **Sidebar**: `sidebarOpen` (global overlay `<Sidebar />` rendered in `App.js`)
- **Offline**: `isOffline` — set to `false` on successful bootstrap, read by `<OfflineBanner />` (shown globally when `true`)
- **Current semester**: `currentSemester` — set from Stud.IP `/semesters` during bootstrap; `null` until hydrated.
- **Settings**: `settings: { notificationsEnabled, biometricLockEnabled }` — persisted to AsyncStorage `ucb_settings` on change in `SettingsScreen.js`; loaded back in `App.js` on mount.

### Navigation Structure

```
RootNavigator (NativeStack)
├── Login (unauthenticated)
└── Main → MainTabs (BottomTabs, lazy=false)
    ├── Home
    ├── Tools → ToolsStack (NativeStack)
    │   ├── ToolsHome, Timetable (`screens/timetable/`), Mensa (`screens/mensa/` — WebView loading mensa.campus-company.eu; falls back to "Open in Browser" in Expo Go), SemesterCalendar (`screens/calendar/`)
    │   ├── CampusResources, PlannerList, AddDeadline
    │   ├── ExamTracker, ExamPlanner
    │   └── CampusPlatforms  (screens/collaboration/CampusPlatformsScreen.js)
    ├── Guide → GuideStack (NativeStack)
    │   ├── GuideHome, GuideDetail
    └── Map
    + RootNavigator also owns: Profile, Settings, NewsFeed,
      CoursesList, CourseDetail (registered directly — no separate stack),
      EventsList → EventsStack (navigation/EventsStack.js),
      Impressum, Datenschutz
```

**Important**: `lazy={false}` on `MainTabs` pre-renders all tabs so nested stacks are initialised before programmatic navigation. Tab press listeners always reset to the root screen of each stack (`ToolsHome`, `GuideHome`) so users can never get stranded.

`navigation/navigationRef.js` exports a `navigationRef` that is passed to `NavigationContainer` in `App.js`, enabling programmatic navigation outside React components. Currently used by the `pendingMapBuilding` deep-link flow (Timetable → Map).

### Data Layer

**Stud.IP (LMS)** — `services/api.js`
- Raw `fetch`-based client with Basic Auth, 10 s timeout, JSON:API `Accept` header.
- `classifyError()` maps HTTP/network errors to typed objects: `AUTH_FAILED` (401/403), `RATE_LIMITED` (429), `SERVER_DOWN` (5xx), `NO_INTERNET` (network/abort), `NO_CREDENTIALS`, `UNKNOWN`.
- `services/courses.js`, `services/events.js`, `services/news.js`, `services/profile.js` each wrap `getApiClient()`.
- `services/courses.js` exports:
  - `fetchCourses(userId, force)` — fetches and caches the user's course memberships; applies semester filter from the store on read.
  - `fetchCurrentSemester()` — fetches `/semesters`, writes `currentSemester` to the store, and invalidates the courses cache when the semester changes. **Not called during bootstrap** — call it explicitly (e.g. from a screen) when a semester refresh is needed.
  - `getCurrentSemesterCourses(courses, fallbackLimit)` — pure filter using the store's `currentSemester`; falls back to the most-represented semester label when the store value is `null`.
  - `fetchCourseDetail(courseId)`, `fetchCourseFiles(courseId)`, `fetchCourseAnnouncements(courseId)` — used by `CourseDetailScreen` to load per-course detail, file refs, and course-level news.
- `services/auth.js` exports `logout()` — clears in-memory credential cache, deletes all three SecureStore keys, wipes the async cache, and calls `useStore.getState().clearUser()`. Called from Profile, Settings, and Sidebar screens.

**Caching** — `services/cache.js`
- AsyncStorage with `ucb_` prefix, TTL-based (`constants/config.js` `CACHE_TTL`).
- `getStaleCacheData()` returns expired data for offline fallback (ignores TTL).
- `clearAllCache()` wipes all `ucb_*` keys **except** the `NON_CACHE_KEYS` set: `ucb_settings`, `ucb_news_last_seen_at`, `ucb_deadlines`, `ucb_exam_reg`, `ucb_exam_plans`, `ucb_going_state`. These are user-owned data that must not be silently deleted (DSGVO Art. 5(1)(f)).

**Supabase** — `services/supabase.js` + `services/contentService.js`
- Used for admin-managed content: Mensa menu, campus events, sports schedule, campus resources, semester calendar, guide content.
- The Supabase client uses the anon/publishable key with `persistSession: false` — all queries are anonymous read-only; no Supabase auth sessions are created or stored.
- `contentService.js` uses `withFallback(cacheKey, fetcher, localFallback)`: try Supabase → cache result to AsyncStorage (`ucb_remote_${cacheKey}`) → fall back to cached → fall back to bundled JSON in `data/`. Read functions are called from screens; write/delete functions (upsert/delete) exist for admin tooling only and are not called from any active screen.
- All Supabase tables have corresponding bundled JSON fallbacks in `data/`.
- Tables (managed in Supabase dashboard — no local migrations): `mensa_menu`, `mensa_meta`, `campus_events`, `sports_schedule`, `campus_resources`, `guide_content`, `semester_calendar`, `calendar_events`, `admin_users`.
- **Required RLS policies** (must be set in Supabase dashboard — anon key is public so writes must be blocked at the DB level): All content tables need `SELECT` enabled for anon, and `INSERT/UPDATE/DELETE` restricted to authenticated users with admin role only. Without these policies any holder of the anon key could write to the tables.

### Content & Guide Data

Guide content lives in `data/guide_*.json` files (14 categories: accommodation, bureaucracy, buildings, checklist, contacts, emergency, faq, glossary, health, language, offices, phrases, rights, work) and is also fetched from the Supabase `guide_content` table (keyed by `category`). Buildings data (`data/buildings.json`) drives both the Guide buildings section and the Map screen.

`utils/campusContent.js` — campus event and sports schedule helpers:
- `normalizeDayName(value)` — maps German day names (montag, dienstag …) to English equivalents and vice versa.
- `isCampusEventRecurring(event)` — true when `isRecurring` or `recurringDay` is set (weekly events vs. one-time dates).
- `isCampusEventActiveOnDate(event, date)`, `isCampusEventPast(event, date)` — date-range checks respecting the recurring/one-time distinction.
- `getTodayCampusEvents(events, date)`, `getUpcomingCampusEvents(events, count, date)` — filtered + sorted lists for the Home screen.
- `getSportsForDate(entries, date)`, `groupSportsByDay(entries)` — filter and group sports schedule entries by day name.
- `buildCampusEventSections(events)` — returns `[{ title, data }]` sections grouped by calendar month (for SectionList).
- `DAY_ORDER` — Mon–Sun array used for consistent day ordering throughout the app.

Other bundled JSON fallbacks in `data/`: `campus_resources.json`, `events_campus.json`, `events_sports.json`, `mensa_week.json`, `semester_calendar.json` — all follow the same contentService offline-first pattern.

### Screen Patterns

All data-fetching screens follow this standard shape:
- `useStore()` for global state + `useState()` for local UI state (loading, refreshing, filters)
- `useEffect()` on mount: check store, call `bootstrapSessionData()` or the relevant service if data is absent
- `useFocusEffect()` on tab focus: refresh to prevent stale data when returning from another tab
- Loading: `<SkeletonLoader />` shown while fetching; content fades in via `Animated.timing()`
- Errors: `<ErrorState />` component with a retry callback
- Pull-to-refresh: `RefreshControl` calls the load function with a `force=true` flag to bypass cache

Example: `screens/home/HomeScreen.js` uses `Promise.allSettled([bootstrapSessionData(force), loadDashboardContent()])` to refresh both store and dashboard content in parallel.

### Notifications

`services/reminders.js` — three scheduled notification types, all gated by `requestNotificationPermission()`:
- **Event**: one-time, fires at 9 AM on the event date
- **Sports**: weekly recurring, 30 min before the scheduled time
- **Deadline**: two-tier — 24 h and 2 h before the deadline

Notification handler is set at module load via `Notifications.setNotificationHandler()`. The on/off toggle lives in `screens/profile/SettingsScreen.js`.

Notification-tap navigation is handled in `App.js` in two places:
- `addNotificationResponseReceivedListener` — handles taps while the app is running or backgrounded.
- `getLastNotificationResponseAsync()` inside `initializeApp()` — handles cold-start taps (app launched by tapping a notification).

Both route via `navigateFromNotification(identifier)`, which uses the notification identifier prefix (`deadline_`, `exam_`, `event_`, `sport_`) to navigate without touching notification content.

### Biometric Lock

`components/BiometricLockScreen.js` uses `expo-local-authentication`. Rendered as a full-screen overlay in `App.js` above the `NavigationContainer` when `isLocked && isLoggedIn`. Lock triggers when the app returns to the foreground after being backgrounded for more than 30 s (`LOCK_GRACE_MS`) and `settings.biometricLockEnabled` is true. `onUnlock` callback clears `isLocked`.

**Cold-start gate**: when biometric lock is enabled and credentials exist in SecureStore (checked via `SECURE_KEYS.USERNAME`), `initializeApp()` sets `isLocked=true` and returns early (storing a `pendingSessionRestoreRef` flag) — session restore and bootstrap are deferred until after the user unlocks. The `handleUnlock` callback detects this flag and calls `checkExistingSession()` + `finishAppInit()` (cold-start notification routing) after unlock.

### App Config Highlights

From `app.json`:
- URL scheme: `"ucb"` — deep-link infrastructure is ready in the store (`pendingMapBuilding`), but no `linking` prop is wired to `NavigationContainer` yet
- `newArchEnabled: true` — New React Native architecture enabled
- Android: `edgeToEdgeEnabled: true`; requires `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` (Map screen)
- OTA updates via Expo's update server using `sdkVersion` runtime version policy

### Key Dependencies

- `react-native-paper` — Material Design components; theme configured in `App.js`
- `@expo/vector-icons` (Ionicons) — all icon usage throughout the app
- `expo-linear-gradient` — gradient backgrounds (HomeScreen header)
- `expo-notifications` — scheduled local notifications (`services/reminders.js`)
- `expo-location` — GPS/location for the campus Map screen
- `react-native-calendars` — calendar UI in planner/deadline screens
- `expo-local-authentication` — biometric prompt in `BiometricLockScreen`
- `expo-web-browser` — in-app browser used by `CampusPlatformsScreen` to open external university platforms
- `expo-clipboard` — copy-to-clipboard for platform URLs in `CampusPlatformsScreen`
- `react-native-webview` — embedded web view used by `MensaScreen`; **not bundled in Expo Go** — `MensaScreen` wraps the `require` in a try/catch and shows an "Open in Browser" fallback when unavailable
- `buffer` — polyfill used in `services/api.js` to base64-encode Basic Auth credentials; React Native has no native `Buffer`
- `react-native-url-polyfill` — imported in `index.js` as `react-native-url-polyfill/auto` to patch the global `URL` class; required by the Supabase JS client — do not remove
- `axios` — listed in `package.json` but not used; the entire API layer uses native `fetch`
- `react-native-vector-icons` — listed in `package.json` but not used; all icon usage is via `@expo/vector-icons` (Ionicons)

### Utilities

`services/buildings.js` — building lookup helpers over `data/buildings.json`:
- `getAllBuildings()`, `getBuildingByIdOrAlias(value)`, `searchBuildings(query)` — all use alias-normalised token matching.
- `buildFallbackBuilding(buildingId)` — synthesises a placeholder when a Stud.IP timetable room code has no entry in the JSON.
- `CAMPUS_CENTER` — coordinates for Umwelt-Campus Birkenfeld (lat/lng), used as the map default.

`services/newsState.js` — unread news badge logic:
- Persists the last-seen timestamp to AsyncStorage key `ucb_news_last_seen_at`.
- `syncUnreadNewsCount(newsItems)` recomputes and writes `unreadNewsCount` into the Zustand store.
- `markNewsSeen(timestamp)` updates both AsyncStorage and the store; called when the user opens the NewsFeed.

`components/SimpleDatePicker.js` — native OS date/time picker wrapper around `@react-native-community/datetimepicker`. Exports `SimpleDatePicker` (date only) and `SimpleTimePicker` (time only). Used by `AddDeadlineScreen` and `ExamPlannerScreen`.

`utils/concurrentMap.js` — concurrency-limited async iteration:
- `concurrentMap(items, fn, limit=3)` — drop-in for `Promise.all(items.map(fn))` with a concurrency cap; used in the bootstrap pipeline when fetching events per course.
- `concurrentSettled(items, fn, limit=3)` — same but wraps results as `{ status, value } | { status, reason }` (mirrors `Promise.allSettled`).

`utils/datetime.js` — central date/time helpers used throughout the app:
- `toMillis(value)` normalises any timestamp input (unix seconds, unix ms, ISO string, `Date`) to milliseconds; returns `null` for invalid values.
- `formatTime24(value)`, `isSameCalendarDay(left, right)`, `formatRelativeFromNow(value)`, `getWeekMonday(date)`.

### Constants

- `constants/colors.js` — all colour tokens; `PRIMARY = '#6FAE3E'` (green), `COURSE_COLORS` array (12 colours, assigned by `index % 12`).
- `constants/config.js` — `BASE_URL`, `STUDIP_WEB_URL`, `CACHE_TTL` map.
- `constants/storageKeys.js` — single source of truth for all AsyncStorage key strings exported as `STORAGE_KEYS`. `cache.js`'s `NON_CACHE_KEYS` references these constants. Never use raw `ucb_*` string literals elsewhere in the codebase.
- `constants/secureKeys.js` — single source of truth for all `expo-secure-store` key strings exported as `SECURE_KEYS` (`USERNAME`, `PASSWORD`, `SESSION_CREATED`). Used in `services/auth.js`, `services/api.js`, and `App.js`. Never use raw string literals for these keys.

### Archive

`_archive/admin/` — the admin panel (AdminStack, AdminDashboardScreen, and per-table admin screens for mensa, events, sports, resources, guide, calendar) was removed from the active app and moved here. It is not registered in any navigator. Do not import from or add back these files without re-evaluating the full admin auth flow.

### AI Usage Tracking

Per the project convention, document any AI-assisted changes in `AI_TRACKING.md` using the format:
```
## YYYY-MM-DD
- ComponentOrFile.js: AI Name — short description
```
