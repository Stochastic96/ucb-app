# UCB Navigator

An Expo 54 / React Native app for international students at **Hochschule Trier** (Umwelt-Campus Birkenfeld, Germany). It integrates with **Stud.IP** (the university LMS, via its JSON:API) and with **Supabase** for admin-managed content (read-only). Every remote-backed feature has a bundled JSON fallback in `data/`, so the app is fully usable offline.

> The app slug is `ucb-navigator` (historical name); the actual university is Hochschule Trier — not UC Berkeley.

## Privacy first

**The app contains no analytics, tracking, or advertising code of any kind.** There is no telemetry, no session/event collection, and no third-party SDKs that phone home. This is a hard product decision — the in-app Datenschutzerklärung, Privacy Policy, and Impressum all state it explicitly. Diagnostic logging (`services/logger.js`) stays **device-local only**.

Other privacy properties:
- Credentials are stored in `expo-secure-store` (device-only; never synced to iCloud), never in code or config — the login screen ships empty.
- The Supabase key is the public **anon/publishable** key (read-only via RLS), not a personal credential.
- Custom fonts are **bundled** (not fetched from Google Fonts at runtime) to avoid transmitting the user's IP — a deliberate GDPR choice.

## Features

- **Courses** — search/filter by semester; browse course details, files, and announcements
- **Timetable** — personal class schedule; jump to a campus building on the Map
- **Events** — campus and sports events; calendar view with local RSVP state
- **News** — course announcements and campus news with an unread badge
- **Mensa** — weekly dining menu (WebView; "Open in Browser" fallback in Expo Go)
- **Guide** — 14 categories (accommodation, bureaucracy, emergency, health, language, offices, …) with search, contacts, and interactive checklists
- **Waste Guide** — offline "which bin does it go in?" lookup for Landkreis Birkenfeld: a fast, bilingual **text search** over a curated list of ~122 items (matches English *and* German regardless of app language), plus browsable bin destinations
- **Tools** — deadline planner, exam tracker, semester calendar, campus resources, collaboration platforms
- **Map** — searchable campus building directory; links out to the device's native maps app
- **Campus Radar** — opt-in, serverless Bluetooth-mesh presence + chat for meeting nearby students (no server, no accounts, nothing linked to Stud.IP; ghost mode on by default)
- **Fact of the Day** — daily sustainability trivia (3 reveals per calendar day)
- **Biometric Lock** — optional fingerprint/face unlock on app resume
- **Light / Dark / System theme** and **English / German** — switchable in Settings (soft remount, no restart)
- **First-run onboarding** + a post-login "Getting started" checklist

## Getting Started

### Prerequisites
- Node.js (LTS) and npm
- Expo Go on an iOS/Android device (for quick development)
- Optional: EAS CLI (`npm install -g eas-cli`) + an Expo account for cloud builds

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` in the project root (see [CLAUDE.md](CLAUDE.md) for details):
   ```
   EXPO_PUBLIC_STUDIP_BASE_URL=https://studip.hochschule-trier.de/jsonapi.php/v1
   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
   EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>
   ```

3. Start development:
   ```bash
   npm start        # Expo Go via QR code
   npm run web      # Browser (limited native features)
   npm run android  # Native Android (requires the Dev Client)
   npm run ios      # Native iOS (requires the Dev Client)
   ```

> Some features use native modules that are **not** bundled in Expo Go (WebView for Mensa, Bluetooth for Campus Radar). These degrade gracefully in Expo Go and require an EAS **development** build to test fully.

## Testing

A Jest suite (`jest-expo`) covers `utils/`, `services/`, `theme/`, `components/`, and `constants/colors.js`, mirrored under `__tests__/`.

```bash
npm test               # run the whole suite once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
npx jest __tests__/services/waste.test.js   # a single file
npx jest -t "searchWasteItems"              # tests matching a name
```

No linter is configured. The codebase is **plain JavaScript** (`.js` throughout); `tsconfig.json` exists only for editor type-checking — do not add `.ts`/`.tsx` files.

## EAS builds

Three profiles are defined in `eas.json` (all share the same `EXPO_PUBLIC_*` env vars):

```bash
eas build --platform android --profile development  # Dev Client
eas build --platform android --profile preview      # installable APK
eas build --platform android --profile production   # APK, autoIncrement
```

## Development

For complete architecture, patterns, and pitfalls, see **[CLAUDE.md](CLAUDE.md)** — it covers auth/session flow, the single Zustand store, navigation structure, the Stud.IP/Supabase/caching data layer, theming/motion/i18n, Campus Radar internals, and common hazards.

**Key conventions**:
- Single Zustand store (`store/useStore.js`); one in-flight bootstrap via `_inflightBootstrap`.
- Offline-first content: Supabase → AsyncStorage cache → bundled JSON in `data/`.
- AsyncStorage keys come from `constants/storageKeys.js`; secure-store keys from `constants/secureKeys.js` — never raw string literals.
- All logging goes through `services/logger.js` (device-local, queryable) — never raw `console.log`.
- Deferred notification side-effects go through `services/offlineQueue.js`.
- New styles use the theme's design tokens (no hardcoded hex/font-sizes/shadows); new hub lists use `components/ListRow.js`.

## File Organization

```
App.js         # Root: providers, navigation, app state, biometric lock, notifications
components/     # Reusable UI (cards, rows, modals, loaders, sidebar, …)
constants/      # Colors/tokens, config, storage & secure key constants, EN/DE translations
data/           # Bundled JSON fallbacks (buildings, guide content, events, waste lists, …)
navigation/     # Navigation stacks (RootNavigator, MainTabs, ToolsStack, …)
screens/        # Feature screens (home, timetable, events, courses, guide, waste, campus, …)
services/       # Stud.IP/Supabase clients, auth, caching, notifications, offline queue, …
store/          # Zustand store (auth, data, UI, session, settings, campus radar)
theme/          # ThemeProvider, MotionProvider, bundled fonts
utils/          # Helpers (date, concurrency, building/campus content)
_archive/       # Shelved code, not wired into any navigator (admin panel, removed waste scanner)
```

## AI Usage Tracking

AI contributions are logged in [AI_TRACKING.md](AI_TRACKING.md) per the project convention:
```
## YYYY-MM-DD
- File.js: AI Name — short description
```

## License & Compliance

- **DSGVO/GDPR**: no personal-data collection, no analytics; user data is device-local; Supabase content tables are anon read-only via RLS. Legal notices are readable in-app before login.
- **MIT** (placeholder — update as needed).

## Contributing

For major changes, open an issue first, and follow the patterns in [CLAUDE.md](CLAUDE.md) for consistency.
