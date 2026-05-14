# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

UCB Navigator is an Expo 54 / React Native app for international students at Hochschule Trier (Germany). It integrates with **Stud.IP** (the university's LMS) via its JSON:API and with **Supabase** for admin-managed content. The app slug is `ucb-navigator`; the actual university is Hochschule Trier, not UC Berkeley — the name is historical.

## Commands

```bash
# Development (Expo Go — no native build needed)
npm start             # expo start --go

# Native builds (requires Dev Client APK installed on device)
npm run android       # expo run:android
npm run ios           # expo run:ios

# CORS proxy for Stud.IP in local dev (if needed)
npm run proxy         # node scripts/studip-proxy.js  (port 3001)

# EAS cloud builds
eas build --platform android --profile preview
eas build --platform android --profile production
```

There is no test suite or linter configured.

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
2. `checkExistingSession` reads credentials from `expo-secure-store`, calls Stud.IP `/users/me`, and returns the user profile.
3. On success, `bootstrapSessionData()` (`services/bootstrap.js`) fetches profile, courses, events, and news in sequence and populates the Zustand store.
4. `RootNavigator` gates on `useStore.isLoggedIn` — renders `LoginScreen` or `MainTabs`.

Credentials (username / password) are stored in `expo-secure-store` and also cached in-memory (`services/api.js` `_cachedUsername/_cachedPassword`) to avoid concurrent SecureStore races.

### State Management

Single Zustand store in `store/useStore.js`. Key slices:
- **Auth**: `isLoggedIn`, `user`, `userId`
- **Data**: `courses`, `events`, `news`, `unreadNewsCount`
- **Session hydration**: `isHydrating`, `dataReady`, `bootstrapError`, `lastSyncAt`
- **Tools**: `deadlines`, `examRegistrations`, `examPlans` (each persisted to a separate AsyncStorage key)
- **Events RSVP**: `goingEventIds`, `goingSportIds`
- **Deep-link**: `pendingMapBuilding` (Timetable → Map navigation)
- **Sidebar**: `sidebarOpen` (global overlay `<Sidebar />` rendered in `App.js`)

`store/useAdminStore.js` is a separate store that checks Supabase `admin_users` table after login.

### Navigation Structure

```
RootNavigator (NativeStack)
├── Login (unauthenticated)
└── Main → MainTabs (BottomTabs, lazy=false)
    ├── Home
    ├── Tools → ToolsStack (NativeStack)
    │   ├── ToolsHome, Timetable, Mensa, SemesterCalendar
    │   ├── CampusResources, PlannerList, AddDeadline
    │   └── ExamTracker, ExamPlanner
    ├── Guide → GuideStack (NativeStack)
    │   ├── GuideHome, GuideDetail
    └── Map
    + RootNavigator also owns: Profile, Settings, NewsFeed,
      CoursesList, CourseDetail, EventsList, Impressum, Datenschutz
```

**Important**: `lazy={false}` on `MainTabs` pre-renders all tabs so nested stacks are initialised before programmatic navigation. Tab press listeners always reset to the root screen of each stack (`ToolsHome`, `GuideHome`) so users can never get stranded.

### Data Layer

**Stud.IP (LMS)** — `services/api.js`
- Raw `fetch`-based client with Basic Auth, 10 s timeout, JSON:API `Accept` header.
- `classifyError()` maps HTTP/network errors to typed objects (`AUTH_FAILED`, `NO_INTERNET`, `SERVER_DOWN`, `NO_CREDENTIALS`, `UNKNOWN`).
- `services/courses.js`, `services/events.js`, `services/news.js`, `services/profile.js` each wrap `getApiClient()`.

**Caching** — `services/cache.js`
- AsyncStorage with `ucb_` prefix, TTL-based (`constants/config.js` `CACHE_TTL`).
- `getStaleCacheData()` returns expired data for offline fallback (ignores TTL).
- `clearAllCache()` wipes all `ucb_*` keys except `ucb_settings`.

**Supabase** — `services/supabase.js` + `services/contentService.js`
- Used for admin-managed content: Mensa menu, campus events, sports schedule, campus resources, semester calendar, guide content.
- `contentService.js` pattern: try Supabase → cache result to AsyncStorage (`ucb_remote_*`) → fall back to cached → fall back to bundled JSON in `data/`.
- All Supabase tables have corresponding bundled JSON fallbacks in `data/`.

### Content & Guide Data

Guide content lives in `data/guide_*.json` files and is also fetched from the Supabase `guide_content` table (keyed by `category`). The `utils/campusContent.js` file provides helpers for campus-specific content. Buildings data (`data/buildings.json`) drives both the Guide buildings section and the Map screen.

### Constants

- `constants/colors.js` — all colour tokens; `PRIMARY = '#6FAE3E'` (green), `COURSE_COLORS` array (12 colours, assigned by `index % 12`).
- `constants/config.js` — `BASE_URL`, `STUDIP_WEB_URL`, `CACHE_TTL` map.

### AI Usage Tracking

Per the project convention, document any AI-assisted changes in `AI_TRACKING.md` using the format:
```
## YYYY-MM-DD
- ComponentOrFile.js: AI Name — short description
```
