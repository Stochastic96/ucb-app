# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

UCB Navigator is an Expo 54 / React Native app for international students at Hochschule Trier (Germany). It integrates with **Stud.IP** (the university's LMS) via its JSON:API and with **Supabase** for admin-managed content and anonymous engagement analytics; all Supabase-backed content has bundled JSON fallbacks in `data/`. The app slug is `ucb-navigator`; the actual university is Hochschule Trier, not UC Berkeley — the name is historical.

## Commands

```bash
# Development (Expo Go — no native build needed)
npm start             # expo start --go

# Web (browser, limited native features)
npm run web           # expo start --web

# Native builds (requires Dev Client APK installed on device)
npm run android       # expo run:android
npm run ios           # expo run:ios

# Tests (Jest + jest-expo)
npm test              # run the whole suite once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
npx jest __tests__/services/news.test.js        # a single test file
npx jest -t "syncUnreadNewsCount"               # tests matching a name

# CORS proxy for Stud.IP in local dev (if needed)
npm run proxy         # node scripts/studip-proxy.js  (port 3001)

# EAS cloud builds  (two profiles: development, production)
eas build --platform android --profile development
eas build --platform android --profile production
```

`production` profile uses `autoIncrement: true`. Both profiles share the same three `EXPO_PUBLIC_*` env vars defined in `eas.json` (Stud.IP base URL + Supabase URL/key).

There is a Jest test suite (config inline in `package.json`, `preset: jest-expo`, global setup in `jest.setup.js`) covering `utils/`, `services/`, `theme/`, `components/`, and `constants/colors.js` — see the `__tests__/` tree (mirrors the source layout). No linter is configured. `jest.setup.js` mocks AsyncStorage (in-memory), stubs `@expo/vector-icons` with Text-based icons (it's bundler-provided and unresolvable under Jest), and silences `console`. When adding modules, prefer pure/testable helpers and add a matching test under `__tests__/`.

The codebase is plain JavaScript (`.js` files throughout); `tsconfig.json` and TypeScript dev dependencies are present but only for editor type-checking support — do not create `.ts`/`.tsx` files.

## Local Development Setup

1. Clone the repo and run `npm install`
2. Create a `.env` file in the project root (see Environment Variables section below)
3. Run `npm start` to launch Expo Go
4. Scan the QR code with Expo Go on your device (iOS/Android)

**Expo Go limitations**: WebView (Mensa screen), and navigation-heavy features work in Expo Go, but standalone builds require the Dev Client APK installed on the device. The app uses `newArchEnabled: true` (React Native New Architecture) — ensure your Expo CLI version matches `expo@~54.0.35` or higher.

**Debugging**: Enable remote debugging in Expo Go settings, or check logs via `npm start` terminal. Error logs are persisted to AsyncStorage (`ucb_logs`) and queryable via the logger service; device logs are accessible via `adb logcat` (Android) or Xcode (iOS).

## Environment Variables

All env vars are prefixed `EXPO_PUBLIC_` and embedded at EAS build time via `eas.json`. For local dev, create a `.env` file:

```
EXPO_PUBLIC_STUDIP_BASE_URL=https://studip.hochschule-trier.de/jsonapi.php/v1
EXPO_PUBLIC_SUPABASE_URL=https://vrnhkwhwoxhcjssqhdat.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<publishable anon key>
```

The Supabase key is the public anon/publishable key (read-only via RLS) — it is **not** a personal credential. No personal Stud.IP login is stored in code or config; the login screen ships empty.

The Stud.IP base URL can also be swapped to `http://localhost:3001` when running the local proxy.

## Architecture

### Auth & Session Flow

1. `App.js` → on mount, loads persisted settings from AsyncStorage (`ucb_settings`) and calls `services/auth.checkExistingSession()`.
2. `checkExistingSession` reads credentials from `expo-secure-store`, calls Stud.IP `/users/me`, and returns the user profile. Sessions older than `SESSION_MAX_AGE` (7 days, `constants/config.js`) require re-login. On `AUTH_FAILED` it deletes credentials and returns `{ valid: false }`; on `NO_INTERNET`/`SERVER_DOWN` it falls back to a stale cached `profile` (via `getStaleCacheData`) and returns `{ valid: true, isOffline: true }` so the user stays logged in offline.
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
- **Settings**: `settings: { notificationsEnabled, biometricLockEnabled, analyticsEnabled, themePreference }` — booleans default `false` (opt-in); `themePreference` defaults `'light'`. Persisted to AsyncStorage `ucb_settings` on change in `SettingsScreen.js`; loaded back in `App.js` on mount. `analyticsEnabled` is the consent gate read by `services/analytics.js` (`shouldTrack()` requires `=== true`) and toggled by `components/AnalyticsConsentModal.js`. `clearUser()` resets the data slices (`deadlines`, `examRegistrations`, `examPlans`, `goingEventIds`, `goingSportIds`) along with auth/session state.

### Navigation Structure

```
RootNavigator (NativeStack — navigation/RootNavigator.js)
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
      FactOfTheDay (screens/facts/FactScreen.js), Impressum, Datenschutz,
      PrivacyPolicy (screens/legal/PrivacyPolicyScreen.js), Legal (screens/legal/LegalScreen.js)
```

`screens/debug/DebugScreen.js` exists for log/cache inspection but is **not** wired into any navigator — reach it only by temporarily registering a route or via a dev shortcut.

**Important**: `lazy={false}` on `MainTabs` pre-renders all tabs so nested stacks are initialised before programmatic navigation. Tab press listeners always reset to the root screen of each stack (`ToolsHome`, `GuideHome`) so users can never get stranded.

`navigation/navigationRef.js` exports a `navigationRef` that is passed to `NavigationContainer` in `App.js`, enabling programmatic navigation outside React components. Currently used by the `pendingMapBuilding` deep-link flow (Timetable → Map).

**Navigation Patterns — useNavigation() vs navigationRef**:
- **Never call `useNavigation()` in overlays or components rendered outside the navigator tree** (e.g., modals in `App.js`). The hook throws `"Couldn't find a navigation object"` when the navigation context has not fully initialized, causing the app to crash on cold start (especially in standalone builds where context initialization is slower than in Expo Go).
- For components like `AnalyticsConsentModal` rendered at the root level, accept a callback prop and use `navigationRef.current?.navigate(...)` from the parent. Example:
  ```jsx
  // In App.js
  <AnalyticsConsentModal onLearnMore={() => navigationRef.current?.navigate('PrivacyPolicy')} />
  
  // In AnalyticsConsentModal.js
  export default function AnalyticsConsentModal({ onLearnMore }) {
    const handleLearnMore = () => onLearnMore?.();
  }
  ```

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
- `clearAllCache()` wipes all `ucb_*` keys **except** the `NON_CACHE_KEYS` set: `ucb_settings`, `ucb_news_last_seen_at`, `ucb_deadlines`, `ucb_exam_reg`, `ucb_exam_plans`, `ucb_going_state`, `ucb_fact_state` (`FACT_STATE`), `ucb_analytics_consent` (`ANALYTICS_CONSENT`), `ucb_offline_queue` (`OFFLINE_QUEUE`), and `ucb_logs`. These are user-owned/diagnostic data that must not be silently deleted (DSGVO Art. 5(1)(f)). Note `ucb_logs` is referenced as a raw literal in `cache.js`, not via `STORAGE_KEYS`.

**Supabase** — `services/supabase.js` + `services/contentService.js`
- Used for admin-managed content: Mensa menu, campus events, sports schedule, campus resources, semester calendar, guide content.
- The Supabase client uses the anon/publishable key with `persistSession: false` — all queries are anonymous read-only; no Supabase auth sessions are created or stored.
- `contentService.js` uses `withFallback(cacheKey, fetcher, localFallback)`: try Supabase → cache result to AsyncStorage (`ucb_remote_${cacheKey}`) → fall back to cached → fall back to bundled JSON in `data/`. Read functions are called from screens; write/delete functions (upsert/delete) exist for admin tooling only and are not called from any active screen.
- All Supabase tables have corresponding bundled JSON fallbacks in `data/`.
- Tables (managed in Supabase dashboard — no local migrations): `mensa_menu`, `mensa_meta`, `campus_events`, `sports_schedule`, `campus_resources`, `guide_content`, `semester_calendar`, `calendar_events`, `admin_users`, `engagement_events`.
- **Required RLS policies** (must be set in Supabase dashboard — anon key is public so writes must be blocked at the DB level): All content tables need `SELECT` enabled for anon, and `INSERT/UPDATE/DELETE` restricted to authenticated users with admin role only. The `engagement_events` table is **insert-only** for anon (no SELECT). Without these policies any holder of the anon key could write to the tables.

### Content & Guide Data

Guide content lives in `data/guide_*.json` files (14 categories: accommodation, bureaucracy, buildings, checklist, contacts, emergency, faq, glossary, health, language, offices, phrases, rights, work) and is also fetched from the Supabase `guide_content` table (keyed by `category`), with the bundled JSON as fallback. Buildings data (`data/buildings.json`) drives both the Guide buildings section and the Map screen.

`utils/campusContent.js` — campus event and sports schedule helpers:
- `normalizeDayName(value)` — maps German day names (montag, dienstag …) to English equivalents and vice versa.
- `isCampusEventRecurring(event)` — true when `isRecurring` or `recurringDay` is set (weekly events vs. one-time dates).
- `isCampusEventActiveOnDate(event, date)`, `isCampusEventPast(event, date)` — date-range checks respecting the recurring/one-time distinction.
- `getTodayCampusEvents(events, date)`, `getUpcomingCampusEvents(events, count, date)` — filtered + sorted lists for the Home screen.
- `getSportsForDate(entries, date)`, `groupSportsByDay(entries)` — filter and group sports schedule entries by day name.
- `buildCampusEventSections(events)` — returns `[{ title, data }]` sections grouped by calendar month (for SectionList).
- `DAY_ORDER` — Mon–Sun array used for consistent day ordering throughout the app.

Other bundled JSON fallbacks in `data/`: `campus_resources.json`, `events_campus.json`, `events_sports.json`, `mensa_week.json`, `semester_calendar.json` — all follow the same contentService offline-first pattern.

### Fact of the Day

A daily sustainability-trivia feature (fits the Umwelt-Campus identity).
- `data/facts.json` — ~37 curated facts shaped `{ id, category, emoji, en: { hook, fact }, source, sourceName }`. **Bilingual-ready** via per-language keys (only `en` is populated today; `getFactCopy(fact, lang)` falls back to English). This is a **bundled-only** dataset loaded directly by `services/facts.js` — it is *not* part of the contentService/Supabase pipeline.
- `services/facts.js` — `getDailyFact()` deterministically picks one fact per local calendar day (stable for everyone that day). A **3-reveals-per-day** allowance (`MAX_REVEALS`) lets the user draw new unseen facts via the screen's "Next" button; it resets at local midnight (`msUntilReset`). State `{ date, revealCount, seenIds }` persists to `STORAGE_KEYS.FACT_STATE` (`ucb_fact_state`), which is in `cache.js`'s `NON_CACHE_KEYS` so a cache clear never resets the allowance.
- `screens/facts/FactScreen.js` (RootNavigator route `FactOfTheDay`) — single card that cycles all facts in place: built-in `Animated` entrance per fact, `expo-haptics` on reveal/lock, category-coloured gradient (`FACT_CATEGORY_COLORS` in `constants/colors.js`), source out-links via `expo-web-browser`, reveals-left dots, and a locked countdown once the daily allowance is spent.
- `HomeScreen.js` shows the day's hook in a "Did you know?" teaser that opens the screen. Category chip labels are `fact_cat_*` translation keys.

### Waste Guide

A "where does it go?" waste-sorting lookup for Landkreis Birkenfeld (deliberately **not** gamified — no streaks/quiz/progress, per product decision).
- `data/waste_bins.json` — 9 disposal destinations (gelber_sack, papier, bio, restmuell, glas, pfand, sondermuell, sperrmuell, altkleider) with real-world bin `color`/`onColor`, Ionicon, and bilingual copy (`en`/`de`: name, tagline, belongs[], never[], howto). `howto` texts reference district practice (AWB pickup, Schadstoffmobil, Wertstoffhof) — review against the current AWB Abfallratgeber yearly.
- `data/waste_items.json` — ~122 items shaped `{ id, bin, emoji, en/de: { name, aliases[], why, caution }, variants? }`. `variants` model split destinations (pizza box: clean → papier, greasy → restmuell). Bundled-only dataset (not contentService/Supabase).
- `services/waste.js` — pure offline module (pattern of `services/buildings.js`): `normalizeWasteToken` folds umlauts/ß; search matches **both languages regardless of active app language**; scored ranking (exact > prefix > word-start > substring). Accessors: `getAllBins`, `getBinById`, `getItemsForBin`, `searchWasteItems(query, limit)`, per-language copy helpers with EN fallback.
- `screens/waste/WasteGuideScreen.js` (ToolsStack route `WasteGuide`) — search-first: empty query shows the 9 bin tiles (tap → bin detail bottom sheet), typing shows live results, tapping a result opens a full-screen answer Modal flooded with the bin's colour (haptic on open, spring entrance gated by `useReducedMotion`). Answer card links into the bin sheet.
- Tests: `__tests__/services/waste.test.js` (data integrity + search behaviour, incl. an every-alias-findable sweep) and `__tests__/screens/WasteGuideScreen.test.js` (render smoke tests; mocks `services/analytics` because it pulls in the Supabase client, which can't construct under Jest).

### Internationalization (EN/DE)

`services/i18n.js` — lightweight string-table i18n, **English-first** (German is being completed):
- Translations live in `constants/translations/en.js` and `de.js` — flat `key → string` maps. `t(key, params)` looks up the active language, falls back to English, then to the raw key; `{{param}}` placeholders are interpolated.
- The active language is a **module-level variable** (`_language`, default `'en'`) so `t()` works in non-component modules too (e.g. `services/reminders.js`). `initLanguage()` (called in `App.js` on mount, gated by `languageReady`) loads the persisted choice from AsyncStorage key `ucb_language`.
- It is mirrored into the Zustand store (`language` / `setLanguage`). **Changing language does a soft remount, not a hard app restart**: `App.js` wraps the tree in `<React.Fragment key={language}>`, so updating `store.language` (from `SettingsScreen`) remounts everything and every `t()` re-reads. `expo-updates`' `reloadAsync` is **not** used for this.

### Theming (Light/Dark Mode)

`theme/ThemeProvider.js` + the `lightTheme`/`darkTheme` palettes in `constants/colors.js`:
- The driver is `settings.themePreference` (`'light' | 'dark' | 'system'`, default `'light'`). `resolveThemeMode(preference, systemScheme)` resolves `'system'` against `useColorScheme()`; everything else maps directly to light/dark.
- **`<ThemeProvider>` wraps the app in `App.js`, inside `<SafeAreaProvider>` and around `<PaperProvider>`.** `App.js` also picks a matching Paper theme (`ucbTheme` / `ucbDarkTheme`, built from `MD3LightTheme`/`MD3DarkTheme`) for the same resolved mode.
- Screens consume the active palette via hooks: `useTheme()` (palette object), `useThemeMode()` (`'light'|'dark'`), and `useThemedStyles(factory)` — a `makeStyles(theme)` → memoised `StyleSheet` helper. **Keep the `makeStyles` factory at module level** so its identity is stable across renders.
- **`lightTheme` maps every token to the app's pre-existing hard-coded color values**, so light mode is pixel-identical to before theming. The static color exports in `constants/colors.js` remain for backward compatibility — screens not yet converted to `useTheme()` keep working and simply stay light. Palette tokens: `primary`, `primaryDark`, `brandIcon`, `onPrimary`, `bg`, `surface`, `surfaceAlt`, `surfaceSunken`, `text`, `textSecondary`, `textMuted`, `textFaint`, `border`, `accent`, `error`, `warning`, `shadow`, `mode`.

### Analytics

`services/analytics.js` — anonymous engagement metrics written to the Supabase `engagement_events` table. **No personal data**; entirely no-op in `__DEV__` so local testing never pollutes production data.
- `SESSION_ID` is a random UUID generated fresh on each cold start — never persisted or linked to any login/device/identity.
- Extra signal is merged **inside the `properties` jsonb** (e.g. `app_language`, `ts`, session-end metrics) — the inserted top-level columns stay fixed (`session_id`, `event_type`, `event_name`, `properties`, `platform`, `app_version`) so we never depend on schema columns that may not exist.
- **Durable queue**: pending events are persisted to AsyncStorage (`ucb_analytics_q`) on enqueue and restored on next `startSession()`, so events survive an app kill before flush. Batches flush at `BATCH_SIZE=10` or every `FLUSH_INTERVAL_MS=30s`; failed inserts are re-queued (capped at `MAX_QUEUE=200`). Failures are swallowed — analytics never breaks the app.
- **Session lifecycle** (wired in `App.js` via AppState): `startSession()` on mount; `endSession()` on background emits a `session_end` event with `duration_ms` / `screens_viewed` / `events` (idempotent via an `_ended` guard); `resumeSession()` on returning to foreground starts a fresh span.
- Exported helpers: `startSession()`, `endSession()`, `resumeSession()`, `trackScreen(name)` (call on mount/focus), `trackEvent(type, name, properties?)`, `flushNow()`.
- Event types: `'session_start'`, `'session_end'`, `'screen_view'`, `'feature_use'`, `'error'`. Screen-view coverage spans the main tabs/tools; feature events include `map_building_opened`, `guide_category_opened`, `deadline_added`, `news_item_opened`. Document the user-facing disclosure in `DatenschutzScreen.js` when adding new signals.

### Screen Patterns

All data-fetching screens follow this standard shape:
- `useStore()` for global state + `useState()` for local UI state (loading, refreshing, filters)
- `useEffect()` on mount: check store, call `bootstrapSessionData()` or the relevant service if data is absent
- `useFocusEffect()` on tab focus: refresh to prevent stale data when returning from another tab
- Loading: `<SkeletonLoader />` shown while fetching; content fades in via `Animated.timing()`
- Errors: `<ErrorState />` component with a retry callback
- Pull-to-refresh: `RefreshControl` calls the load function with a `force=true` flag to bypass cache

Example: `screens/home/HomeScreen.js` uses `Promise.allSettled([bootstrapSessionData(force), loadDashboardContent()])` to refresh both store and dashboard content in parallel.

### Logging

`services/logger.js` — centralized logging service, **do not use raw `console.log()`**:
- Exports `info(source, message, data?)`, `debug(source, message, data?)`, `warn(source, message, data?)`, `error(source, message, errorOrData?, data?)`
- All logs are stored in memory (capped at 50 entries) and persisted to AsyncStorage (`ucb_logs`)
- Console output includes timestamp, emoji icon, source module, and structured data
- **Error-level logs automatically track to analytics** (via `trackEvent`) in production, helping identify app crashes
- Error logs are queryable via `getLogsByLevel()`, `getLogsBySource()`, `getRecentLogs()`, `getStats()` for debugging
- Example usage: `logger.error('Bootstrap', 'Failed to load courses', bootstrapError, { courseCount: 5 })`

**Avoid logging sensitive data** (credentials, personal identifiers, PII) — the logs persist to device storage and are exposed in dev screens.

### Notifications

`services/reminders.js` — three scheduled notification types, all gated by `requestNotificationPermission()`:
- **Event**: one-time, fires at 9 AM on the event date
- **Sports**: weekly recurring, 30 min before the scheduled time (skipped if the start is before 00:30)
- **Deadline**: per-flag — `remind2h` schedules 2 h before, `remindOnTime` schedules at the due time (`deadline_2h_*` / `deadline_ontime_*`). The legacy 24 h tier is no longer scheduled but is still cancelled (`deadline_24h_*`) for backward compatibility with old saved deadlines.
- **Exam**: two-tier — 24 h and 2 h before (`exam_*` identifiers).

`requestNotificationPermission()` requests the OS permission first and auto-updates `settings.notificationsEnabled` when granted.

Notification handler is set at module load via `Notifications.setNotificationHandler()`. The on/off toggle lives in `screens/profile/SettingsScreen.js`.

Notification-tap navigation is handled in `App.js` in two places:
- `addNotificationResponseReceivedListener` — handles taps while the app is running or backgrounded.
- `getLastNotificationResponseAsync()` inside `initializeApp()` — handles cold-start taps (app launched by tapping a notification).

Both route via `navigateFromNotification(identifier)`, which uses the notification identifier prefix (`deadline_`, `exam_`, `event_`, `sport_`) to navigate without touching notification content.

### Smart Offline Queue

`services/offlineQueue.js` — deferred side-effect queue for notification scheduling when offline or immediately after state changes.

- **Enqueueing**: When adding/updating deadlines or exam plans, calls `enqueueOfflineOp(type, payload)` to queue reminder operations (`SCHEDULE_DEADLINE_REMINDERS`, `SCHEDULE_EXAM_REMINDERS`, `CANCEL_DEADLINE_REMINDERS`, `CANCEL_EXAM_REMINDERS`) instead of executing them immediately. This guards against race conditions when the reminders service is not yet initialized.
- **Persistence**: Queue is persisted to AsyncStorage (`ucb_offline_queue`) up to 50 items; survives app kills.
- **Draining**: `drainOfflineQueue()` (called on bootstrap completion + when coming online) processes queued operations sequentially. Failed ops are re-queued; queue size is written to the store for UI visibility.
- **Initialization**: `initOfflineQueue()` called in `App.js` on mount restores the queue from AsyncStorage and drains immediately if the app starts with connectivity.
- Used by: `screens/planner/AddDeadlineScreen.js`, `screens/planner/PlannerScreen.js`, `screens/exams/ExamPlannerScreen.js` — they enqueue instead of calling reminders directly, decoupling state changes from notification initialization order.

### Biometric Lock

`components/BiometricLockScreen.js` uses `expo-local-authentication`. Rendered as a full-screen overlay in `App.js` above the `NavigationContainer` when `isLocked && isLoggedIn`. Lock triggers when the app returns to the foreground after being backgrounded for more than 30 s (`LOCK_GRACE_MS`) and `settings.biometricLockEnabled` is true. `onUnlock` callback clears `isLocked`.

**Cold-start gate**: when biometric lock is enabled and credentials exist in SecureStore (checked via `SECURE_KEYS.USERNAME`), `initializeApp()` sets `isLocked=true` and returns early (storing a `pendingSessionRestoreRef` flag) — session restore and bootstrap are deferred until after the user unlocks. The `handleUnlock` callback detects this flag and calls `checkExistingSession()` + `finishAppInit()` (cold-start notification routing) after unlock.

### App Config Highlights

From `app.json`:
- URL scheme: `"ucb"` — deep-link infrastructure is ready in the store (`pendingMapBuilding`), but no `linking` prop is wired to `NavigationContainer` yet
- `newArchEnabled: true` — New React Native architecture enabled
- Android: `edgeToEdgeEnabled: true`. No location permissions and no native map module — the Map screen (`screens/map/MapScreen.js`) is a searchable list of the main campus buildings; tapping one opens a detail sheet, and "Open campus in maps" / per-building "Navigate" link out to the device's native maps app (`geo:` / `maps:` URLs). Works in Expo Go.
- OTA updates via Expo's update server using `sdkVersion` runtime version policy

### Key Dependencies

- `react-native-paper` — Material Design components; theme configured in `App.js`
- `@expo/vector-icons` (Ionicons) — all icon usage throughout the app
- `expo-linear-gradient` — gradient backgrounds (HomeScreen header)
- `expo-notifications` — scheduled local notifications (`services/reminders.js`)
- `react-native-calendars` — calendar UI in planner/deadline screens
- `expo-local-authentication` — biometric prompt in `BiometricLockScreen`
- `expo-web-browser` — in-app browser used by `CampusPlatformsScreen` to open external university platforms
- `expo-clipboard` — copy-to-clipboard for platform URLs in `CampusPlatformsScreen`
- `react-native-webview` — embedded web view used by `MensaScreen`; **not bundled in Expo Go** — `MensaScreen` wraps the `require` in a try/catch and shows an "Open in Browser" fallback when unavailable
- `buffer` — polyfill used in `services/api.js` to base64-encode Basic Auth credentials; React Native has no native `Buffer`
- `expo-updates` — OTA updates (`app.json` `updates.url`). Note: it is **not** used for language switching (that is a soft remount; see Internationalization).
- `react-native-url-polyfill` — imported in `index.js` as `react-native-url-polyfill/auto` to patch the global `URL` class; required by the Supabase JS client — do not remove
- `expo-haptics` — light tap / warning feedback in the Fact screen. The Fact card animations use React Native's **built-in `Animated`** API (not Reanimated/Moti). Moti + `react-native-reanimated` were tried and removed: in Expo Go they couple to specific native versions (`react-native-worklets` must match Expo Go's bundled build) and Moti pulled in a duplicate React — both surfaced as runtime crashes. Stick to `Animated` unless/until the app ships as a dev/EAS build rather than Expo Go.
- `axios` — listed in `package.json` but not used; the entire API layer uses native `fetch`
- `react-native-vector-icons` — listed in `package.json` but not used; all icon usage is via `@expo/vector-icons` (Ionicons)

### Utilities

`services/buildings.js` — building lookup helpers over `data/buildings.json`:
- `getAllBuildings()`, `getBuildingByIdOrAlias(value)`, `searchBuildings(query)` — all use alias-normalised token matching.
- `buildFallbackBuilding(buildingId)` — synthesises a placeholder when a Stud.IP timetable room code has no entry in the JSON.
- `buildNativeMapsLabel(building)` — builds the label/query string used when `MapScreen` links out to the device's native maps app (`geo:` / `maps:` directions).
- `isMainCampusBuilding(building)` — true for the buildings shown on the Map screen: `academic`/`hotel` types only. Student dormitories and generic `building`-type entries are filtered out of the Map list (but remain resolvable via `getBuildingByIdOrAlias`, e.g. for Timetable deep-links). Used in `MapScreen` as `searchBuildings(search).filter(isMainCampusBuilding)`.
- `CAMPUS_CENTER` — coordinates for Umwelt-Campus Birkenfeld (lat/lng), used as the map default and the "Open campus in maps" link target.

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

`hooks/useReducedMotion.js` — returns `true` when the OS "Reduce Motion" accessibility setting is on (subscribes to live changes). Use it to skip/short-circuit entrance, looping, and press animations so the app honours prefers-reduced-motion. Reach for this in any new animated component.

### Constants

- `constants/colors.js` — all colour tokens; `PRIMARY = '#6FAE3E'` (green), `COURSE_COLORS` array (12 colours, assigned by `index % 12`).
- `constants/config.js` — `BASE_URL`, `STUDIP_WEB_URL`, `CACHE_TTL` map.
- `constants/storageKeys.js` — single source of truth for all AsyncStorage key strings exported as `STORAGE_KEYS`. `cache.js`'s `NON_CACHE_KEYS` references these constants. Never use raw `ucb_*` string literals elsewhere in the codebase.
- `constants/secureKeys.js` — single source of truth for all `expo-secure-store` key strings exported as `SECURE_KEYS` (`USERNAME`, `PASSWORD`, `SESSION_CREATED`, `BIOMETRIC_ENABLED`). Used in `services/auth.js`, `services/api.js`, `App.js`, and `SettingsScreen.js`. Never use raw string literals for these keys. `BIOMETRIC_ENABLED` (`ucb_secure_biometric_enabled`) is the tamper-resistant cold-start biometric gate — set in `SettingsScreen.js`, read in `App.js`, deleted in `auth.js` `_deleteCredentials`.

### Archive

`_archive/admin/` — the admin panel (AdminStack, AdminDashboardScreen, and per-table admin screens for mensa, events, sports, resources, guide, calendar) was removed from the active app and moved here. It is not registered in any navigator. Do not import from or add back these files without re-evaluating the full admin auth flow.

## Common Pitfalls & Development Patterns

### Navigation Hazards
- **useNavigation() in root-level components**: Never call `useNavigation()` in components rendered outside the navigator tree (e.g., modals in `App.js`). It throws when the navigation context hasn't initialized, crashing the app on cold start, especially in standalone builds. Use `navigationRef.current?.navigate()` from parent instead (pass callbacks down).
- **Tab press listeners**: Always reset to root screen (via `listeners` prop on tabs) so users never get stranded in a nested screen when tapping their current tab.
- **Deep navigation depth**: When nesting stacks (RootNavigator → MainTabs → ToolsStack → TimetableScreen), use `navigation.getParent()?.getParent()?.navigate()` to reach the right level. Pre-render all tabs with `lazy={false}` on MainTabs so nested stacks initialize before programmatic navigation.

### State & Async Patterns
- **Concurrent bootstrap guard**: Use `_inflightBootstrap` deduplication to ensure only one bootstrap runs at a time, even if multiple screens call `bootstrapSessionData()` simultaneously.
- **Offline queue before notifications**: Always enqueue reminder side-effects via `enqueueOfflineOp()` instead of calling reminders directly. This prevents race conditions when the reminders service hasn't initialized yet.
- **Atomic writes**: For critical user data (deadlines, exam plans, settings), write to AsyncStorage **first**, then Zustand. Reverse the read order to handle crashes mid-write.
- **Pull-to-refresh**: Use `force=true` flag to bypass cache when calling services from RefreshControl. Always have a `.catch()` on Promise chains to prevent loading spinners hanging on error.

### Expo Go Limitations
- **WebView**: `react-native-webview` is not bundled in Expo Go. `MensaScreen` wraps the require in a try/catch and shows an "Open in Browser" fallback when unavailable. To test WebView, build with EAS or the Dev Client.
- **New Architecture**: Ensure `expo@~54.0.35` or later is installed. SDK 50 and SDK 54 have incompatible JSI bridges — mixing them breaks native modules.
- **Animation libraries**: `Moti + react-native-reanimated` couple to specific native versions in Expo Go and added a duplicate React, causing runtime crashes. Stick to React Native's built-in `Animated` API for now.

### Storage & Persistence
- **Never raw `ucb_*` literals**: Use `STORAGE_KEYS` constants from `constants/storageKeys.js`. This is the single source of truth.
- **Non-cache keys**: Settings, deadlines, exam plans, RSVP state, and news timestamps must never be cleared by `clearAllCache()` — they're in the `NON_CACHE_KEYS` set (DSGVO Art. 5(1)(f) compliance).
- **Secure store**: Credentials use `WHEN_UNLOCKED_THIS_DEVICE_ONLY` to prevent iCloud sync to other devices. Session age is tracked via the `ucb_session_created` key — enforce a 7-day max age.

### Logging & Errors
- **No console.log()**: Use `services/logger.js` — all logs are persisted to AsyncStorage and queryable. Error-level logs auto-track to analytics in production.
- **Avoid sensitive data**: Never log credentials, personal identifiers, or PII — logs are device-local but still a security risk if the device is compromised.

### Analytics & Privacy
- **Durable queue**: Analytics events are queued to AsyncStorage and survive app kills. Failed inserts are re-queued (capped at MAX_QUEUE). Failures are swallowed — analytics never breaks the app.
- **No personal data**: SESSION_ID is a random UUID per cold start, never persisted or linked to identity. All metrics are anonymous.
- **Dev no-op**: Analytics is entirely no-op in `__DEV__` mode, so local testing never pollutes production data.

### AI Usage Tracking

Per the project convention, document any AI-assisted changes in `AI_TRACKING.md` using the format:
```
## YYYY-MM-DD
- ComponentOrFile.js: AI Name — short description
```
