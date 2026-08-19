# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

UCB Navigator is an Expo 54 / React Native app for international students at Hochschule Trier (Germany). It integrates with **Stud.IP** (the university's LMS) via its JSON:API and with **Supabase** for admin-managed content (read-only); all Supabase-backed content has bundled JSON fallbacks in `data/`. **The app contains no analytics, tracking or advertising code of any kind — this is a hard product decision (2026-07-27); never reintroduce tracking.** The app slug is `ucb-navigator`; the actual university is Hochschule Trier, not UC Berkeley — the name is historical.

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

# EAS cloud builds  (three profiles: development, preview, production)
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
```

**`npm install` in this repo needs `--legacy-peer-deps`** — a pre-existing Babel 7/8 ERESOLVE conflict between the `@babel/plugin-transform-*` devDependencies and `babel-preset-expo`. This is the first thing a fresh clone hits.

The three EAS profiles differ in output, not just versioning: `development` builds the Dev Client (`developmentClient: true`, internal distribution); **`preview` is the installable Android APK** (`buildType: "apk"`, internal distribution) — this is the profile to use for hand-distributed test builds; **`production` builds a Play Store AAB** (`buildType: "app-bundle"`, `distribution: "store"`, `autoIncrement: true`) and is *not* directly installable. `eas.json` also declares `cli.appVersionSource: "remote"` (version codes live on EAS, not in `app.json`) and a `submit.production.android` block pointing at `./pc-api-key.json` — the Google Play service-account key, gitignored and never committed. All three profiles share the same three `EXPO_PUBLIC_*` env vars defined in `eas.json` (Stud.IP base URL + Supabase URL/key).

There is a Jest test suite (config inline in `package.json`, `preset: jest-expo`, global setup in `jest.setup.js`) covering `utils/`, `services/`, `theme/`, `components/`, `constants/colors.js`, and a handful of `screens/` render/behaviour tests — see the `__tests__/` tree (mirrors the source layout). Coverage is collected from `utils/`, `services/`, `theme/`, `components/`, `constants/colors.js` (`collectCoverageFrom`) — screens are tested but not counted. No linter is configured. `jest.setup.js` mocks AsyncStorage (in-memory), stubs `@expo/vector-icons` with Text-based icons (it's bundler-provided and unresolvable under Jest), and silences `console`. When adding modules, prefer pure/testable helpers and add a matching test under `__tests__/`.

The codebase is plain JavaScript (`.js` files throughout); `tsconfig.json` and TypeScript dev dependencies are present but only for editor type-checking support — do not create `.ts`/`.tsx` files.

## Local Development Setup

1. Clone the repo and run `npm install --legacy-peer-deps`
2. Create a `.env` file in the project root (see Environment Variables section below)
3. Run `npm start` to launch Expo Go
4. Scan the QR code with Expo Go on your device (iOS/Android)

**Expo Go limitations**: WebView (Mensa screen), and navigation-heavy features work in Expo Go, but standalone builds require the Dev Client APK installed on the device (`expo-dev-client` is a dependency). Campus Radar's BLE mesh and the Mensa WebView are the two features that genuinely need a Dev Client / EAS build — both degrade gracefully (mock mode / "Open in Browser") rather than crashing. The app uses `newArchEnabled: true` (React Native New Architecture) — ensure your Expo CLI version matches `expo@~54.0.35` or higher.

**Native project folders are generated, not tracked**: `/ios` and `/android` are gitignored (see `.gitignore`). An `ios/` prebuild may exist locally — `expo prebuild` / `npm run ios` regenerates it from `app.json`, so never hand-edit files there and expect them to survive. iOS scene setup (`SceneDelegate`) is declared through `app.json`'s `ios.infoPlist.UIApplicationSceneManifest`, which is why it survives a regenerate.

**Navigation is React Navigation v6** (`@react-navigation/native@^6`, `bottom-tabs@^6`, `native-stack@^6`) — not v7. Check v6 docs before using APIs from newer examples.

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
- **Offline**: `isOffline` — set to `false` on successful bootstrap, read by `<OfflineBanner />` (shown globally when `true`); `offlineQueueSize` mirrors the offline queue length for UI visibility
- **Onboarding**: `onboarded` — first-run welcome flow completed (persisted at `STORAGE_KEYS.ONBOARDED`, resolved in `App.js` before first render)
- **Campus Radar**: `campusProfile` (self-authored; `realName` is LOCAL-ONLY, never broadcast), `radarEnabled`, `radarPeers`, `radarUnread`, `radarBtState`, and `radarGhost` (**defaults `true`** — see Campus Radar section)
- **Current semester**: `currentSemester` — set from Stud.IP `/semesters` during bootstrap; `null` until hydrated.
- **Settings**: `settings: { notificationsEnabled, biometricLockEnabled, themePreference }` — booleans default `false` (opt-in); `themePreference` defaults `'light'`. Persisted to AsyncStorage `ucb_settings` on change in `SettingsScreen.js`; loaded back in `App.js` on mount. `clearUser()` resets the data slices (`deadlines`, `examRegistrations`, `examPlans`, `goingEventIds`, `goingSportIds`) along with auth/session state.

### Navigation Structure

```
RootNavigator (NativeStack — navigation/RootNavigator.js)
├── Onboarding / Login (unauthenticated branch — Onboarding first, Login once `store.onboarded`)
└── Main → MainTabs (BottomTabs, lazy=false)
    ├── Home
    ├── Tools → ToolsStack (NativeStack)
    │   ├── ToolsHome, Timetable (`screens/timetable/`), Mensa (`screens/mensa/` — WebView loading mensa.campus-company.eu; falls back to "Open in Browser" in Expo Go), SemesterCalendar (`screens/calendar/`)
    │   ├── CampusResources, PlannerList, AddDeadline
    │   ├── ExamTracker, ExamPlanner
    │   ├── CampusPlatforms  (screens/collaboration/CampusPlatformsScreen.js)
    │   ├── WasteGuide  (screens/waste/)
    │   └── CampusRadar, CampusProfileEdit, CampusOnboarding, CampusChat  (screens/campus/)
    ├── Guide → GuideStack (NativeStack)
    │   ├── GuideHome, GuideDetail
    └── Map
    + RootNavigator also owns: Profile, Settings, NewsFeed,
      CoursesList, CourseDetail (registered directly — no separate stack),
      EventsList → EventsStack (navigation/EventsStack.js),
      FactOfTheDay (screens/facts/FactScreen.js), Impressum, Datenschutz,
      PrivacyPolicy (screens/legal/PrivacyPolicyScreen.js), LegalNotice (screens/legal/LegalScreen.js)
```

`screens/debug/DebugScreen.js` exists for log/cache inspection but is **not** wired into any navigator — reach it only by temporarily registering a route or via a dev shortcut.

**Important**: `lazy={false}` on `MainTabs` pre-renders all tabs so nested stacks are initialised before programmatic navigation. Tab press listeners always reset to the root screen of each stack (`ToolsHome`, `GuideHome`) so users can never get stranded.

`navigation/navigationRef.js` exports a `navigationRef` that is passed to `NavigationContainer` in `App.js`, enabling programmatic navigation outside React components. Currently used by the `pendingMapBuilding` deep-link flow (Timetable → Map).

**Navigation Patterns — useNavigation() vs navigationRef**:
- **Never call `useNavigation()` in overlays or components rendered outside the navigator tree** (e.g., modals in `App.js`). The hook throws `"Couldn't find a navigation object"` when the navigation context has not fully initialized, causing the app to crash on cold start (especially in standalone builds where context initialization is slower than in Expo Go).
- For components rendered at the root level (e.g. overlays in `App.js`), accept a callback prop and use `navigationRef.current?.navigate(...)` from the parent instead of `useNavigation()`.

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
- `clearAllCache()` wipes all `ucb_*` keys **except** the `NON_CACHE_KEYS` set (the authoritative list lives in `cache.js`): `SETTINGS`, `NEWS_LAST_SEEN`, `DEADLINES`, `EXAM_REGISTRATIONS`, `EXAM_PLANS`, `GOING_STATE`, `FACT_STATE`, `OFFLINE_QUEUE` (`ucb_offline_q`), `GUIDE_CHECKLIST`, `CAMPUS_PROFILE`, `CAMPUS_BLOCKED`, `CAMPUS_CONSENT`, `ONBOARDED`, `FIRST_STEPS`, `LOGS` (`ucb_logs`). These are user-owned/diagnostic data that must not be silently deleted (DSGVO Art. 5(1)(f)). `NON_CACHE_KEYS` is exported so tests can assert against it. **When adding a new user-owned AsyncStorage key, declare it in `STORAGE_KEYS` and add it to `NON_CACHE_KEYS` too** — otherwise a cache clear silently deletes it, and (if it is not in `STORAGE_KEYS`) "Delete all data" silently *fails* to delete it. Both directions are guarded by the erasure tests in `__tests__/screens/LegalScreens.test.js`.

**Supabase** — `services/supabase.js` + `services/contentService.js`
- Used for admin-managed content: Mensa menu, campus events, sports schedule, campus resources, semester calendar, guide content.
- The Supabase client uses the anon/publishable key with `persistSession: false` — all queries are anonymous read-only; no Supabase auth sessions are created or stored.
- `contentService.js` uses `withFallback(cacheKey, fetcher, localFallback)`: try Supabase → cache result to AsyncStorage (`ucb_remote_${cacheKey}`) → fall back to cached → fall back to bundled JSON in `data/`. Read functions are called from screens; write/delete functions (upsert/delete) exist for admin tooling only and are not called from any active screen.
- All Supabase tables have corresponding bundled JSON fallbacks in `data/`.
- Tables (managed in Supabase dashboard — no local migrations): `mensa_menu`, `mensa_meta`, `campus_events`, `sports_schedule`, `campus_resources`, `guide_content`, `semester_calendar`, `calendar_events`, `admin_users`. (An `engagement_events` table exists in the dashboard from the removed analytics feature — nothing writes to it anymore; it can be dropped.)
- **Required RLS policies** (must be set in Supabase dashboard — anon key is public so writes must be blocked at the DB level): All content tables need `SELECT` enabled for anon, and `INSERT/UPDATE/DELETE` restricted to authenticated users with admin role only. Without these policies any holder of the anon key could write to the tables.

### Content & Guide Data

Guide content lives in `data/guide_*.json` files (14 categories: accommodation, bureaucracy, buildings, checklist, contacts, emergency, faq, glossary, health, language, offices, phrases, rights, work) and is also fetched from the Supabase `guide_content` table (keyed by `category`), with the bundled JSON as fallback. Buildings data (`data/buildings.json`) drives both the Guide buildings section and the Map screen. Checklist tick state persists to `STORAGE_KEYS.GUIDE_CHECKLIST` (in `NON_CACHE_KEYS`) from `GuideDetailScreen`.

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
- `services/waste.js` — **pure, fully-offline text-search module** (pattern of `services/buildings.js`): no camera, no AI classifier, no network call — every answer is looked up against the two curated bundled lists. `normalizeWasteToken` folds umlauts/ß **and** turns punctuation/hyphens into word breaks (`"t-shirt"` → `"t shirt"`). `searchWasteItems(query, limit)` matches **both languages regardless of active app language** and is multi-token: each query word is scored against an item's authoritative term list (name + aliases, EN + DE) with `exact > prefix > word-start > substring`, a whole-phrase bonus, and **AND semantics** (every query word must match somewhere) so word order (`"box pizza"`) and typos tolerate but precision holds. Accessors: `getAllBins`, `getBinById`, `getAllWasteItems`, `getWasteItemById`, `getItemsForBin`, per-language copy helpers with EN fallback.
- `screens/waste/WasteGuideScreen.js` (ToolsStack route `WasteGuide`) — search-first: empty query shows the 9 bin tiles (tap → bin detail bottom sheet), typing shows live results, tapping a result opens a full-screen answer Modal flooded with the bin's colour (haptic on open, spring entrance gated by `useReducedMotion`). Answer card links into the bin sheet.
- Tests: `__tests__/services/waste.test.js` (data integrity + search behaviour — every-alias-findable sweep, word-order/punctuation tolerance, AND-semantics precision) and `__tests__/screens/WasteGuideScreen.test.js` (render smoke tests).
- **A camera-based Waste Scanner (on-device TFLite image classification + barcode → Open Food Facts lookup) was removed 2026-07-28.** It was dropped to keep the tool text-search-only: the barcode mode was the app's only third-party network call and was never disclosed in the legal screens, and the camera stack pulled in heavy native modules + a `CAMERA` permission. It was archived to `_archive/waste_scanner/`, but that directory **no longer exists on disk and was never committed** — the code is gone. Treat re-adding it as a from-scratch feature that reopens the legal-disclosure and permission questions above, not as a restore.

### Campus Radar (serverless BLE-mesh socializing)

Opt-in Bluetooth-mesh presence + chat for meeting nearby students — **no server, no accounts, nothing linked to Stud.IP**. Foreground-only by design: the radar stops when the user navigates OUT of the Campus Radar flow (RadarScreen's blur cleanup deliberately does **not** stop it when `CampusChat`/`CampusProfileEdit`/`CampusOnboarding` are pushed on top — stopping there would kill the mesh session mid-conversation); iOS background BLE discovery is effectively impossible anyway.

- **Transport**: `react-native-mesh-sdk` (maintained RN port of the current bitchat native cores — BLE mesh relay, Noise XX-encrypted DMs, GCS gossip sync, RSSI). `services/campusRadar.js` probes `NativeModules.MeshSdk` **before** requiring the SDK (its facade constructs a `NativeEventEmitter` at import time) and falls back to a full MOCK mode (synthetic peers through the real crypto path) in Expo Go/Jest. `setMeshId()` pins private campus UUIDs so UCB devices form their own mesh, disjoint from the public bitchat network — changing those UUIDs is a breaking network split.
- **Identity**: `services/campusIdentity.js` — anonymous Ed25519 keypair, generated on-device, stored in SecureStore (`SECURE_KEYS.CAMPUS_ID_SK/PK`), never derived from Stud.IP. On-air identity is an 8-byte fingerprint of the public key.
- **ProfileCard v3** (`services/campusProfile.js`): compact signed binary card (≤512 B; worst case ≈ 350 B) carrying nick/status/DE-INT origin **plus 1-byte degree-program id, 1-byte semester, 1-byte "open to" bitmask (`OPEN_TO`), and speak/learn language ids (≤3 each, `LANGUAGES` wire table)**. Programs/languages travel as ids only — bilingual names render locally from `data/campus_programs.json` (stable wire ids — never renumber/reuse; review against the official catalog yearly; accessors in `services/campusPrograms.js`) and the `LANGUAGES` table. The signed body embeds a **4-byte unix timestamp + the sender's transport peer id** — receive-side `validateHello()` rejects stale replays, unbound cards, and cards re-broadcast from a different device (impersonation). `decodeCard` is version-enforcing and bounds-checked (`UNSUPPORTED_CARD_VERSION` / `CARD_TRUNCATED`). Interests never travel in plaintext: X25519 pairwise blinded 8-byte tokens (`blindTokens`), comparable only within one peer pair. `scoreMatch` weights: shared interests ×2, DE↔INT ×3, language tandem ×4 (both ways) / ×2 (one way), same program ×3, same semester ×1.
- **Real name (PRIVACY INVARIANT)**: `profile.realName` is **local-only and not representable in the card codec** — it can never be broadcast. It travels exclusively via `shareMyName(peerId)`: signed together with the recipient's fingerprint + timestamp (same anti-replay binding as the identity proof) over the Noise-encrypted DM channel to ONE chosen peer; receive side is guarded by the pure `checkNameShare()`. A one-tap **wave** (👋, `sendWave`) exists as a low-pressure icebreaker — DM channel only, rate-limited, freshness-checked. Peer state from a name share / proof is sticky across 60 s re-announces but resets if the peer's identity fingerprint changes.
- **Trust ladder**: `verified` (card signature valid) → `proven` (Ed25519 identity proof exchanged over the Noise-encrypted DM channel, bound to recipient fingerprint + timestamp so proofs can't be replayed to third parties).
- **Ghost mode** (`store.radarGhost`, **defaults `true` = safe**): when on you discover nearby students and read the Campus Room but broadcast **no** presence card (`announcePresence` no-ops), so you never appear in anyone's Nearby list; sending is locked (ChatThreadScreen shows a "Go Visible" bar). `setGhostMode(false)` announces immediately. This is the primary safety control — users browse hidden and opt into visibility.
- **Abuse resistance & safety posture**: per-peer ingest rate limit (10 msgs/10 s), relay-duplicate LRU, 500-char cap, block-by-fingerprint (persisted to `STORAGE_KEYS.CAMPUS_BLOCKED`). **Report is intentionally local** (block + hide) — because the feature is serverless there is *no central moderation and no report inbox to operate*; the report dialog says so and routes serious cases to Campus Security / police (`tel:110`). Do not add a server-side report sink without re-evaluating the operator's content-host/data-controller liability. Nickname is a self-authored pseudonym, never a real name, never read from Stud.IP; consent sheet carries a 16+ / meet-in-public / no-moderation safety notice.
- **Screens**: `screens/campus/` — RadarScreen (toggle + consent-sheet fallback gated on `STORAGE_KEYS.CAMPUS_CONSENT`; match list with filter chips All/My program/My semester/Tandem, search over nick/status/program/shared name, per-row wave, **Chats section** so conversations stay reachable after a peer ages out of Nearby), **CampusOnboardingScreen** (5-step first-run wizard: consent → identity incl. optional real name → program/semester via `ProgramPickerModal` → open-to/languages via `LanguagePickerModal` + interests → Ghost explainer; all profile-setup entry points route here), ProfileEditScreen (same fields for later edits), ChatThreadScreen (Campus Room broadcast + DMs; inverted list with WhatsApp-style message grouping, trust strip — E2E / signature-verified / identity-proven / in-out-of-range —, room-reach strip, "Share my name" + handover in the ⋯ menu, wave button + wave empty-state CTA, radar-off/Ghost composer states, system chips for wave/name events, header shows "Real Name · nick" after a verified share). Routes `CampusRadar`/`CampusProfileEdit`/`CampusOnboarding`/`CampusChat` in ToolsStack. Chat threads are session-only (never persisted, capped at 200 messages each) — deliberate privacy choice.
- **Chat delivery & reliability**: own DMs carry a **monotonic delivery ladder** `sending → sent → delivered → read` (plus `failed` with tap-to-retry) — correlated by passing the local message id into `Mesh.sendPrivateMessage` and listening to the SDK's `onDeliveryAck` / `onReadReceipt` / `onDeliveryStatusUpdate`; a late ack can never downgrade a state. Read receipts go out only when the thread is actually on screen (`notifyThreadViewed`, per-session dedupe). Room messages are fire-and-forget (no status). **Ghost mode is enforced in the service layer** (`_send`/`sendWave`/`shareMyName` no-op while ghosted), not just the UI. Blocking records the transport peer id (`registerBlockedPeerId`) so a blocked identity's ROOM broadcasts are dropped even though its peer entry never enters the store. A native start failure on a real device throws `RADAR_START_FAILED` (alerted in RadarScreen/ChatThreadScreen) instead of falling back to mock — **mock mode exists only where `NativeModules.MeshSdk` is absent** (Expo Go / simulator / Jest), never as a device fallback.
- **Permissions**: Android needs the runtime BLE permissions **plus `ACCESS_FINE_LOCATION` on all API levels** — the vendored bitchat core's permission manager requires it (BLE-scan technicality; GPS is never read). Requested in `campusRadar.requestNativePermissions()`; disclosed in `DatenschutzScreen`. iOS uses the `NSBluetooth*` Info.plist strings; no background modes declared (foreground-first).
- **DSGVO**: consent sheet before first activation (Art. 6(1)(a)), self-authored profile only, Datenschutz section documents the data flows incl. the Android location-permission technicality.
- Tests: `__tests__/services/campusIdentity|campusProfile|campusRadar.test.js` — codec round-trips, blinding symmetry, mock discovery, and the `validateHello` replay/impersonation matrix.

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
- **`lightTheme` maps every token to the app's pre-existing hard-coded color values**, so light mode is pixel-identical to before theming. The static color exports in `constants/colors.js` remain for backward compatibility — screens not yet converted to `useTheme()` keep working and simply stay light. Palette tokens: `primary`, `primaryDark`, `brandIcon`, `onPrimary`, `bg`, `surface`, `surfaceAlt`, `surfaceSunken`, `text`, `textSecondary`, `textMuted`, `textFaint`, `border`, `accent`, `error`, `warning`, `warningSurface`, `warningBorder`, `onWarning`, `info`, `infoSurface`, `shadow`, `mode`.
- **Design tokens (mandatory for all new styles)**: the theme also carries `type` (10 typography presets — display/titleLg/title/heading/bodyStrong/body/bodySm/label/caption/micro — each bundling fontFamily + fontSize + lineHeight; spread as `...c.type.title`; **never add `fontWeight` next to a custom fontFamily** — Android silently falls back to the system font; weights are baked into the family names), `shadows` (`card`/`raised`/`overlay` elevation levels, per-mode), plus `spacing`/`radius`/`fonts`. Feature color maps live in `constants/colors.js` with light+dark variants: `GUIDE_CATEGORY_COLORS` (+`guideCategoryColor(key, mode)`), `CALENDAR_CATEGORY_COLORS`, `TOOL_ICON_COLORS`, `PLATFORM_ICON_COLORS`, `PLANNER_CATEGORY_COLORS`, and the `withAlpha(hex, alphaHex)` helper (6-digit-hex-guarded). Do not hardcode hex colors, font sizes below 11, or ad-hoc shadows in screens — `__tests__/constants/colors.test.js` guards the token invariants, and `screens/debug/` is the only exempt directory. Minimum text size is 11 (`micro`); `App.js` caps OS text scaling at 1.4× globally. App chrome fonts: Paper theme via `configureFonts`, navigation `headerTitleStyle`/`tabBarLabelStyle` in the navigators.

### Custom Fonts

`theme/fonts.js` — bundles Space Grotesk (display/headings) and Lexend (body/reading text, chosen for reading fluency/ESL readers) via `@expo-google-fonts/*` npm packages, **not** a runtime Google Fonts CDN fetch. This is a deliberate GDPR choice: German courts have ruled that runtime Google Fonts loading transmits the user's IP to Google without consent, so the font binaries ship inside the app bundle instead. `useAppFonts()` (via `expo-font`'s `useFonts`) loads every weight referenced by `FONT_FAMILY`; `App.js` calls it as `fontsReady` and gates rendering on it so text never flashes the system fallback before swapping to the custom family. Keep this GDPR rationale in mind before adding any other web-font/CDN-based font loading.

### Motion Policy

`theme/MotionProvider.js` — app-wide reduced-motion policy, engine-agnostic on purpose (plain config objects usable by both React Native's built-in `Animated` and, if ever installed, Reanimated). Wraps the app in `App.js` (inside `GestureHandlerRootView`, around `NavigationContainer`). Reads `useReducedMotion()` once and exposes `useMotion()` → `{ shouldAnimate, spring, timing, stagger }` so every animated component honors the OS "Reduce Motion" setting (BITV 2.0 / EN 301 549 accessibility compliance) without re-subscribing individually. Prefer `useMotion()` over calling `useReducedMotion()` directly in new animated components.

### First-Run Onboarding & Getting Started

- **Pre-login welcome flow** (`screens/onboarding/OnboardingScreen.js`, route `Onboarding` in RootNavigator): 4-slide horizontal pager — welcome + EN/DE language choice (language switch soft-remounts; safe because it happens on slide 1), "everything in four tabs" brief, a **trust slide** (login goes encrypted directly to the university; all user data device-local; zero tracking; offline-first) linking to Datenschutz, then the login CTA. Skippable at any point; completion writes `STORAGE_KEYS.ONBOARDED` and flips `store.onboarded`, which swaps the unauthenticated branch to `Login`. `App.js` resolves the flag before rendering the navigator (`onboardReady` gate) so nothing flashes.
- **Legal screens live OUTSIDE the auth gate** in RootNavigator on purpose — Datenschutz/Impressum/PrivacyPolicy/LegalNotice must be readable BEFORE login (DSGVO transparency; the trust slide links there).
- **Post-login "Getting started" checklist** (`components/GettingStartedCard.js` on Home, state in `services/firstSteps.js`, key `STORAGE_KEYS.FIRST_STEPS`): 5 tap-through steps (timetable, Mensa, guide, map, planner) with a progress bar; dismissible; hides itself when complete. Purely local state — deliberately chosen over a one-shot spotlight tour (checklists with visible progress retain better).

### ListRow — the list-first design contract

`components/ListRow.js` is the single row pattern for hub screens (product decision 2026-07-27: calm uniform lists, **no tile grids**). Anatomy: 40×40 tinted icon tile → title (`bodyStrong`) + one-line subtitle (`bodySm`) → right accessory (chevron default, `badge` red urgency count, `count` neutral quantity pill, or custom node). Card variant matches the classic tool-card chrome; `compact` variant is for rows inside an existing card (Home quick links, Getting-started steps). ToolsScreen, GuideScreen categories and Home quick links all render through it — new hub lists must too, rather than hand-rolling row styles.

### No Analytics (hard product decision)

The app ships with **zero analytics/tracking code** (removed 2026-07-27 at the owner's direction). There is no tracking service, no consent modal, no session/event collection, and no `engagement_events` writes. The Datenschutzerklärung, Privacy Policy and Impressum state this explicitly ("no analytics, tracking or advertising code of any kind") — reintroducing any tracking would make those statements false, so treat this as an invariant. Diagnostic logging (`services/logger.js`) stays device-local only.

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
- **Persistence**: Queue is persisted to AsyncStorage (`STORAGE_KEYS.OFFLINE_QUEUE` = `ucb_offline_q`) up to 50 items; survives app kills.
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
- Android: `edgeToEdgeEnabled: true`. No native map module — the Map screen (`screens/map/MapScreen.js`) is a searchable list of the main campus buildings; tapping one opens a detail sheet, and "Open campus in maps" / per-building "Navigate" link out to the device's native maps app (`geo:` / `maps:` URLs). Works in Expo Go. The app declares Bluetooth permissions + `ACCESS_FINE_LOCATION` **solely for Campus Radar BLE scanning** (Android requires it; GPS is never read — see Campus Radar section); there is no other location use, and no camera permission (the former Waste Scanner was removed — see Waste Guide).
- OTA updates via Expo's update server using `sdkVersion` runtime version policy
- **Hardening flags (privacy-relevant — do not flip casually)**: Android `allowBackup: false` (blocks `adb backup` / auto-backup exfiltration of the app's AsyncStorage + SecureStore data) and `usesCleartextTraffic: false` (HTTPS only). Both back the claims in the legal screens.
- `userInterfaceStyle: "automatic"` — the OS may hand the app either scheme; the in-app theme driver is still `settings.themePreference` (see Theming), which defaults to `'light'`
- iOS: `bundleIdentifier: app.ucbnavigator.ios`, `supportsTablet: true` (so tablet-only gaps like a Wi-Fi-only iPad having no `tel:` handler are real — see `services/linking.js`), `NSBluetooth*` usage strings, and a `UIApplicationSceneManifest` wiring `SceneDelegate`. Android: `package: app.ucbnavigator`.
- `plugins`: `expo-secure-store`, `expo-notifications`, `@react-native-community/datetimepicker`, `expo-web-browser`, `expo-font`. `react-native-mesh-sdk` has **no** config plugin — its permissions come from its own AndroidManifest at prebuild plus the entries above.

### Key Dependencies

- `react-native-paper` — Material Design components; theme configured in `App.js`
- `@expo/vector-icons` (Ionicons) — all icon usage throughout the app
- `expo-linear-gradient` — gradient backgrounds (HomeScreen header)
- `expo-notifications` — scheduled local notifications (`services/reminders.js`)
- `expo-local-authentication` — biometric prompt in `BiometricLockScreen`
- `expo-web-browser` — in-app browser used by `CampusPlatformsScreen` to open external university platforms
- `expo-clipboard` — copy-to-clipboard for platform URLs in `CampusPlatformsScreen`
- `react-native-webview` — embedded web view used by `MensaScreen`; **not bundled in Expo Go** — `MensaScreen` wraps the `require` in a try/catch and shows an "Open in Browser" fallback when unavailable
- `buffer` — polyfill used in `services/api.js` to base64-encode Basic Auth credentials; React Native has no native `Buffer`
- `expo-updates` — OTA updates (`app.json` `updates.url`). Note: it is **not** used for language switching (that is a soft remount; see Internationalization).
- `react-native-url-polyfill` — imported in `index.js` as `react-native-url-polyfill/auto` to patch the global `URL` class; required by the Supabase JS client — do not remove
- `expo-haptics` — light tap / warning feedback in the Fact screen. The Fact card animations use React Native's **built-in `Animated`** API (not Reanimated/Moti). Moti + `react-native-reanimated` were tried and removed: in Expo Go they couple to specific native versions (`react-native-worklets` must match Expo Go's bundled build) and Moti pulled in a duplicate React — both surfaced as runtime crashes. Stick to `Animated` unless/until the app ships as a dev/EAS build rather than Expo Go.
- `@expo-google-fonts/space-grotesk` + `@expo-google-fonts/lexend` + `expo-font` — bundled custom fonts loaded via `theme/fonts.js` (see Custom Fonts above).
- `react-native-gesture-handler` — imported once at the top of `index.js` (side-effect import, required before anything else) and wraps the app in a `GestureHandlerRootView` in `App.js`; required by React Navigation's native-stack gestures.
- `react-native-mesh-sdk` — Campus Radar's BLE-mesh transport (vendored current bitchat cores, Noise XX E2EE, GCS sync, RSSI). **Native module unavailable in Expo Go/Jest** — `services/campusRadar.js` probes `NativeModules.MeshSdk` before requiring it and falls back to mock mode. No Expo config plugin; the required permissions come from its AndroidManifest (merged at prebuild) + the entries already in `app.json`. Note: `npm install` in this repo currently needs `--legacy-peer-deps` due to a **pre-existing** Babel 7/8 ERESOLVE conflict (unrelated to this package).
- `tweetnacl` — pure-JS Ed25519/X25519 for the Campus Radar identity, card signatures, and interest-token blinding (fully unit-testable under Jest; no native crypto dependency).
- `react-native-get-random-values` — side-effect import in `index.js` that polyfills `crypto.getRandomValues` so `tweetnacl` can generate keys/nonces on-device — do not remove (Jest uses node crypto, so tests don't exercise it).
- `expo-dev-client` — the Dev Client runtime; `npm start` still runs `expo start --go`, so switch to `npm run android`/`npm run ios` (or an EAS `development` build) when you need native modules.
- **Installed but unused — do not assume they are available patterns**: `lottie-react-native` and `react-native-svg` are in `package.json` but imported nowhere in the app. `react-native-reanimated` and Moti are **not** installed at all (see the `expo-haptics` note above for why). All animation goes through React Native's built-in `Animated`.

### Utilities

`services/linking.js` — centralizes every outbound `Linking.openURL` call so the platform-compat guards live in one place: `openExternalUrl(url)` always `.catch()`es (an unhandled rejection otherwise crashes the screen on a device with no handler for `tel:`/`mailto:`/`geo:`, e.g. a Wi-Fi-only iPad); `openInMaps(lat, lng, label)` hides the iOS (`https://maps.apple.com/?ll=...` universal link) vs. Android (`geo:` intent) divergence. Route all new external-link/native-maps calls through this module rather than calling `Linking.openURL` directly.

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
- `constants/secureKeys.js` — single source of truth for all `expo-secure-store` key strings exported as `SECURE_KEYS` (`USERNAME`, `PASSWORD`, `SESSION_CREATED`, `BIOMETRIC_ENABLED`, plus `CAMPUS_ID_SK`/`CAMPUS_ID_PK` for the Campus Radar Ed25519 identity keypair). Used in `services/auth.js`, `services/api.js`, `services/campusIdentity.js`, `App.js`, and `SettingsScreen.js`. Never use raw string literals for these keys. `BIOMETRIC_ENABLED` (`ucb_secure_biometric_enabled`) is the tamper-resistant cold-start biometric gate — set in `SettingsScreen.js`, read in `App.js`, deleted in `auth.js` `_deleteCredentials`.

### Archive (removed — `_archive/` is gone)

The repo previously carried an `_archive/` tree for shelved code. **It no longer exists on disk**, so any reference to it (in older docs, `AI_TRACKING.md`, or `README.md`'s file-organization block) is dangling:

- `_archive/admin/` — the admin panel (AdminStack, AdminDashboardScreen, per-table admin screens for mensa/events/sports/resources/guide/calendar, `useAdminStore`, and a `check-admin` Supabase edge function). Still in git history; the deletion is currently **unstaged**, so `git restore _archive` brings it back until it is committed. Do not re-integrate without re-evaluating the full admin auth flow. Note that `contentService.js` still exports the upsert/delete write functions this panel used — they are called from no active screen.
- `_archive/waste_scanner/` and `_archive/waste_ai/` — the camera Waste Scanner (TFLite/WasteNet model, labels, `waste_rules.json`) and its earlier MobileNet model. These were **never committed**, so they are not recoverable from git.

If a future change needs to shelve code again, decide deliberately whether to commit the archive — the last two rounds effectively deleted it.

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
- **No console.log()**: Use `services/logger.js` — all logs are persisted to AsyncStorage (device-local only) and queryable.
- **Avoid sensitive data**: Never log credentials, personal identifiers, or PII — logs are device-local but still a security risk if the device is compromised.

### Privacy
- **No analytics/tracking of any kind** — hard invariant (see "No Analytics" above). Legal screens promise it.

### AI Usage Tracking

Per the project convention, document any AI-assisted changes in `AI_TRACKING.md` using the format:
```
## YYYY-MM-DD
- ComponentOrFile.js: AI Name — short description
```

### Other docs in this repo — trust order

`CLAUDE.md` (this file) and `README.md` are the maintained pair. The rest have drifted; **do not take them as current**:

- `COPILOT.md` — a parallel agent doc, last refreshed before several product decisions. It still says Supabase is used for "anonymous engagement analytics" and that there is "no test suite or linter configured" — **both false**, and the first one directly contradicts the no-analytics invariant. Either refresh it alongside `CLAUDE.md` or delete it; do not let it be a second source of truth.
- `BUILD_PRODUCTION_APK.md` — predates the current `eas.json`. It names bundle ID `com.anonymous.ucb` (now `app.ucbnavigator.ios`) and describes `production` as an APK for direct distribution (it is now a Play Store AAB; `preview` is the APK profile).
- `PRODUCTION_AUDIT_FIXES.md`, `AI_TRACKING.md` — historical records of past work. Useful for *why* a decision was made; not a description of the present tree.
