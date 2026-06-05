# UCB Navigator

An Expo 54 React Native app for students at **Hochschule Trier** (University for Environmental and Business Studies / Umwelt-Campus Birkenfeld, Germany). Integrates with **Stud.IP** (university LMS via JSON:API) and **Supabase** for admin-managed content and anonymous analytics. All content has bundled JSON fallbacks for offline-first functionality.

> Note: The app slug is `ucb-navigator` (historical name); the actual university is Hochschule Trier.

## Features

- **Courses** — search and filter by semester; browse course details, files, and announcements
- **Timetable** — view personal class schedule; navigate to campus buildings via Maps
- **Events** — campus and sports events; calendar view with RSVP state
- **News** — course announcements and campus news with unread badge
- **Mensa** — weekly dining menu with dietary filters and 3-tier pricing
- **Guide** — 14 categories (accommodation, emergency, health, language, offices, etc.) with search; contacts and interactive checklists
- **Tools** — deadline planner, exam tracker, semester calendar, campus resources, collaboration platforms
- **Map** — interactive campus building directory with external maps navigation
- **Biometric Lock** — optional fingerprint/face unlock on app resume
- **Fact of the Day** — daily sustainability trivia; 3 reveals per calendar day
- **Multilingual** — English and German (soft language switch via settings)

## Getting Started

### Prerequisites
- Node.js (LTS) and npm
- [Expo CLI](https://docs.expo.dev/more/glossary/#expo-cli) — `npm install -g expo-cli`
- Expo Go app on iOS/Android device (for development)
- Optional: EAS CLI (`npm install -g eas-cli`) and Expo account for cloud builds

### Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Create `.env` in project root with your Stud.IP + Supabase credentials (see CLAUDE.md for details):
   ```
   EXPO_PUBLIC_STUDIP_BASE_URL=https://studip.hochschule-trier.de/jsonapi.php/v1
   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
   EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>
   ```

3. Start development:
   ```bash
   npm start        # Expo Go via QR code
   npm run web      # Browser (limited native features)
   npm run android  # Native Android (requires Dev Client APK)
   npm run ios      # Native iOS
   ```

## Development

For complete architecture, patterns, and troubleshooting, see **[CLAUDE.md](CLAUDE.md)** — it has sections on:
- Auth & session flow, state management (Zustand), navigation structure
- Data layer (Stud.IP API, Supabase, caching strategy)
- Services (analytics, notifications, offline queue, biometric lock)
- Common pitfalls (navigation, async patterns, Expo Go limitations)
- AI usage tracking conventions

**Key points**:
- Plain JavaScript only (`.js` files); TypeScript types for IDE support only
- No test suite or linter configured
- `lazy={false}` on MainTabs pre-renders all screens for safe programmatic navigation
- `navigationRef` for navigation outside React components (safe at cold start)
- AsyncStorage keys from `constants/storageKeys.js` — never use raw string literals
- `services/logger.js` for all logging (persisted, queryable, anonymized error tracking)

## Architecture Highlights

- **Single Zustand store** (`store/useStore.js`) for auth, data, session hydration, tools, offline state, settings
- **Deduplication guard** on bootstrap (`_inflightBootstrap`) ensures only one concurrent data refresh
- **Offline-first content** — Supabase with fallback to AsyncStorage cache, then bundled JSON in `data/`
- **Smart offline queue** (`services/offlineQueue.js`) for deferred notification side-effects (deadlines, exams)
- **Durable analytics queue** — events persist and retry on next session; no-op in dev mode
- **Secure store** for credentials (prevents iCloud sync across devices)

## File Organization

```
App.js                    # Root with navigation, app state, biometric lock, notifications
components/               # Reusable UI (cards, modals, loaders, sidebar, etc.)
constants/                # Colors, config (API timeouts), storage key constants, translations
data/                     # Bundled JSON fallbacks (buildings, guide content, events, etc.)
navigation/               # Navigation stacks (RootNavigator, MainTabs, ToolsStack, etc.)
screens/                  # Feature screens (home, timetable, events, courses, etc.)
services/                 # API clients, auth, caching, analytics, notifications, etc.
store/                    # Zustand state slices (auth, data, UI, session)
utils/                    # Helpers (date, async, building search, etc.)
_archive/admin/           # Removed admin panel (shelved until re-evaluation)
```

## AI Usage Tracking

AI contributions are documented in [AI_TRACKING.md](AI_TRACKING.md) per the project convention:
```
## YYYY-MM-DD
- File.js: AI Name — short description
```

This helps maintain context on implementation decisions and architectural choices.

## License & Compliance

- **DSGVO compliant**: No personal data collection; anonymous session-scoped metrics only; RLS policies enforce read-only anon access to Supabase content tables
- **MIT** (placeholder — update as needed)

## Contributing

For major changes, please discuss in an issue first. Follow the patterns in CLAUDE.md for consistency.
