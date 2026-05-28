# AI Usage Log

Document which AI (Copilot, Claude, Codex, etc.) contributed to which part of the codebase. Add a new entry each time an AI helps with a feature or file.

## 2026-05-28 — Navigation fixes + Tooltip component
- screens/events/EventsScreen.js: Claude Sonnet 4.6 — Fix back button: canGoBack/goBack was checking EventsStack (single-screen, always false) instead of the full navigation tree
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — Fix Timetable back arrow from Home: navigate to ToolsHome+openTimetable param instead of directly to Timetable (race condition when ToolsStack uninitialized)
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Handle openTimetable param via useEffect (pushes Timetable from within ToolsStack → guaranteed back arrow); remove "Available" label; informative hero subtitle
- components/Tooltip.js: Claude Sonnet 4.6 — Reusable ? icon with fade modal overlay; tap to dismiss
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Add Tooltip in filter bar explaining deadlines + reminders
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Add Tooltip alongside progress title explaining QIS checklist behaviour

## 2026-05-28 — Guide/Tools UI consistency pass
- screens/guide/GuideScreen.js: Claude Sonnet 4.6 — Align visual style with ToolsScreen: add hero banner, SURFACE background, card borderRadius 14, elevation 2, icon box 48×48/r13, label 16/700, desc 13, chevron size 18, marginHorizontal 12 on cards, "Topics" section label

## 2026-05-28 — Engagement metrics (Supabase analytics)
- services/analytics.js: Claude Sonnet 4.6 — New service: anonymous session-scoped event tracker; batches to Supabase every 30s or 10 events; no-op in dev; session_id is random UUID per cold start, never persisted or linked to user
- App.js: Claude Sonnet 4.6 — Add startSession() on mount, flushNow() on AppState background
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — trackScreen('HomeScreen') in useFocusEffect
- screens/map/MapScreen.js: Claude Sonnet 4.6 — trackScreen, campus_plan_opened, building_selected (list + plan), navigate_to_building, building_search_used
- screens/timetable/TimetableScreen.js: Claude Sonnet 4.6 — trackScreen on mount
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — trackScreen on mount
- screens/guide/GuideScreen.js: Claude Sonnet 4.6 — trackScreen + guide_category_opened per category
- screens/news/NewsFeedScreen.js: Claude Sonnet 4.6 — trackScreen in useFocusEffect + news_item_opened
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — deadline_added on new deadline save
- services/reminders.js: Claude Sonnet 4.6 — notification_scheduled (type: event/sport/deadline/exam) in each schedule function
- services/bootstrap.js: Claude Sonnet 4.6 — bootstrap_success (+ course_count) and bootstrap_error (+ error_type)
- screens/legal/DatenschutzScreen.js: Claude Sonnet 4.6 — Add analytics disclosure row, update intro to "studentengeführtes Projekt", update Supabase section, update footer
- screens/legal/ImpressumScreen.js: Claude Sonnet 4.6 — Add "Über dieses Projekt" section, version bump to Beta

## 2026-05-28 — German vocabulary + CampusPlanView integration
- data/buildings.json: Claude Sonnet 4.6 — Renamed all dormitories to "Studierendenwohnheim XXXX", lecture buildings to "Lehrgebäude XXXX", 9912/9913 to German faculty names (Dekanat UWuR/UPuT), 9914 to "Prüfungsamt & AStA", 9925 to "IBT Technikum – Vizepräsidium", 9928 to "Campus Company & Wohnheim-Service"; all service labels converted to German
- screens/map/MapScreen.js: Claude Sonnet 4.6 — Add "Campusplan anzeigen" outlined button in hero card; opens CampusPlanView in a full-screen Modal with back arrow; tapping a building in the plan closes the plan and opens the detail sheet

## 2026-05-27 — Campus map: schematic plan view + building data corrections
- data/buildings.json: Claude Sonnet 4.6 — Corrected 7 buildings from official website crawl: 9912 (UWuR dean's building), 9913 (UPuT vice dean), 9914 (AStA Room 012), 9924 (Studienservice Room 35, Dean, Chancellor), 9925 (VP Room 12), 9917 (IT-ServicePoint Room 112), renamed 9939→9938 (KG building number was wrong per official map)
- screens/map/CampusPlanView.js: Claude Sonnet 4.6 — New component; interactive schematic campus plan matching official Umwelt-Campus map layout; 26 buildings as tappable blocks; parking areas, road labels, legend, compass; no location permission needed
- screens/map/MapScreen.js: Claude Sonnet 4.6 — Add Map / Campus Plan toggle; CampusPlanView shares the same building selection bottom sheet
- screens/map/MapScreen.js: GPT-5.2-Codex — Revert to legacy campus guide list UI (no in-app map), with search + external navigation

## 2026-05-26 — Architecture refactor: quality, scalability, maintainability
- constants/storageKeys.js: Claude Sonnet 4.6 — New file; single source of truth for all AsyncStorage key strings; eliminates scattered literals across App.js, reminders.js, newsState.js, cache.js
- constants/colors.js: Claude Sonnet 4.6 — Add CATEGORY_COLORS export; eliminates identical definition duplicated in HomeScreen and EventsScreen
- utils/datetime.js: Claude Sonnet 4.6 — Add getGreeting, getTimeUntil, formatShortDate, daysUntil; extracted from HomeScreen/EventsScreen where they were defined locally
- services/cache.js: Claude Sonnet 4.6 — Import STORAGE_KEYS; NON_CACHE_KEYS now references constants instead of raw strings (was a manual sync requirement)
- services/bootstrap.js: Claude Sonnet 4.6 — Fix race condition: force=true previously bypassed deduplication guard, allowing two concurrent _runBootstrap calls to race-write the store; now chains after the current run. Also loads going state once per bootstrap, removing duplicate AsyncStorage reads from HomeScreen and EventsScreen mounts
- services/reminders.js: Claude Sonnet 4.6 — Complete DAY_WEEKDAY map (was only Monday/Wednesday/Thursday; sports on Tue/Fri/Sat/Sun silently got no reminder); use STORAGE_KEYS constants for persistence keys
- services/newsState.js: Claude Sonnet 4.6 — Use STORAGE_KEYS.NEWS_LAST_SEEN instead of raw string literal
- services/contentService.js: Claude Sonnet 4.6 — Add console.warn to withFallback catch; bare catch {} previously silenced all Supabase errors making fallback invisible in dev
- App.js: Claude Sonnet 4.6 — Use STORAGE_KEYS for privacy and settings AsyncStorage reads
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — Remove inline EVENT_CATEGORY_COLORS, getGreeting, getTimeUntil, formatShortDate (now imported from shared modules); remove duplicate loadGoingState mount effect
- screens/events/EventsScreen.js: Claude Sonnet 4.6 — Remove inline CATEGORY_COLORS, formatDate, daysUntil (now imported); remove duplicate loadGoingState mount effect

## 2026-05-25 — CLAUDE.md accuracy fixes
- CLAUDE.md: Claude Sonnet 4.6 — Fix clearAllCache() docs (lists all 6 NON_CACHE_KEYS, DSGVO note); add RATE_LIMITED to classifyError types; document WHEN_UNLOCKED_THIS_DEVICE_ONLY SecureStore flag and ucb_session_created key; fix State Management list formatting; add _archive/admin/ section

## 2026-05-23 — Deep security audit: additional hardening
- app.json: Claude Sonnet 4.6 — Set allowBackup:false on Android; prevents ADB backup extracting AsyncStorage (deadlines, exam plans, cached Stud.IP data) on non-rooted devices
- services/supabase.js: Claude Sonnet 4.6 — Disable persistSession + autoRefreshToken; app never uses Supabase auth so no anon JWT should be stored in AsyncStorage
- CLAUDE.md: Claude Sonnet 4.6 — Document required Supabase RLS policies; note that write functions exist for admin tooling only and are not called from active screens

## 2026-05-23 — Full audit: crash fixes, security hardening, state integrity
- CLAUDE.md: Claude Sonnet 4.6 — Improved arch docs: added currentSemester store slice, SESSION_MAX_AGE, bootstrap deduplication guard (_inflightBootstrap), and JS-only codebase clarification
- utils/concurrentMap.js: Claude Sonnet 4.6 — Guard against null/undefined items (`!items?.length`) to prevent TypeError when API returns null
- screens/exams/ExamPlannerScreen.js: Claude Sonnet 4.6 — Safe-guard route.params destructuring (??{}); add .catch() on loadExamData; atomic write order (AsyncStorage before Zustand)
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Add .catch() on loadExamData().then() to prevent unhandled rejection hanging the loading state
- screens/courses/CourseDetailScreen.js: Claude Sonnet 4.6 — Add .catch() on Promise.allSettled chain; clear loading flag in catch so spinner never hangs
- screens/guide/GuideDetailScreen.js: Claude Sonnet 4.6 — Add .catch() on AsyncStorage.getItem().then() to prevent uninitialised checklist state
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Add .catch() on loadDeadlines().then() to prevent unhandled rejection
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Atomic write order reversed (AsyncStorage first, then Zustand) for crash-safe deadline persistence
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Atomic write order for settings (AsyncStorage first); deletion order fix (logout before wipe) for crash-safe data deletion
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — mixedContentMode "compatibility" → "never" to block HTTP subresources in HTTPS page
- screens/guide/InfoSectionView.js: Claude Sonnet 4.6 — URL validation guard before Linking.openURL (blocks javascript:/data: injection from Supabase-sourced data)
- services/contentService.js: Claude Sonnet 4.6 — Wrap localFallback() in try/catch; return [] on error instead of crashing the whole fallback chain
- services/bootstrap.js: Claude Sonnet 4.6 — Guard fetchAllEvents return with ?? []; reset courses/events on first-load failure to avoid partial state
- components/BiometricLockScreen.js: Claude Sonnet 4.6 — Add authenticatingRef guard to prevent concurrent auth attempts bypassing the 3-fail limit
- App.js: Claude Sonnet 4.6 — Cold-start biometric gate (checks SecureStore before session restore); AppState listener reads live store state to avoid stale closure; handleUnlock runs session restore after biometric success on cold-start

## 2026-05-19
- screens/mensa/MensaScreen.js: Claude — Replaced static JSON menu with embedded WebView loading mensa.campus-company.eu; added progress bar, loading overlay, error/retry state, and refresh button in header
- components/SearchBar.js: Claude — New shared search input component with clear button, used across list screens
- screens/courses/CoursesScreen.js: Claude — Added search bar filtering by course title, lecturer, semester; switches between SectionList (grouped) and FlatList (search results)
- screens/news/NewsFeedScreen.js: Claude — Added search bar + horizontal course/source filter chips
- screens/guide/GuideScreen.js: Claude — Added search bar filtering 14 guide categories by label and description
- screens/resources/CampusResourcesScreen.js: Claude — Added search bar alongside existing category filter chips; empty state when no results
- screens/events/EventsScreen.js: Claude — Added search bar to Campus Events tab filtering by title, organizer, category
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Fix lecturer field name (course.lecturer → course.lecturerName)
- screens/exams/ExamPlannerScreen.js: Claude Sonnet 4.6 — Fix exam date stored as full ISO string (breaks reminder construction); parse stored YYYY-MM-DD as local midnight to avoid UTC timezone shift
- services/reminders.js: Claude Sonnet 4.6 — Fix thirtyMinBefore() returning negative hour for sports before 00:30; wrap all cancelScheduledNotificationAsync calls in try-catch
- services/cache.js: Claude Sonnet 4.6 — Protect user-owned personal data (deadlines, exam plans, exam registrations, RSVP state, news last-seen) from clearAllCache; DSGVO Art. 5(1)(f) compliance
- services/contentService.js: Claude Sonnet 4.6 — Explicitly pass null for mensa_meta on metaRes.error rather than silently falling through
- components/BiometricLockScreen.js: Claude Sonnet 4.6 — Fix stale closure on mount auto-trigger using useCallback + useRef for failCount
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Fix partial settings write (each toggle now composes full next object); update cache-clear dialog text to clarify personal data is not affected (DSGVO transparency)
- App.js: Claude Sonnet 4.6 — Wire up notification tap → navigate handler (addNotificationResponseReceivedListener + getLastNotificationResponseAsync for cold-start); navigates by identifier only, no personal data handled
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Course picker for Academic category: full current-semester course list shown on field focus, filters as you type, stores courseId link alongside deadline, colour-coded linked-course badge with clear button, auto-unlinks on manual text edit
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Show linked course colour dot next to subject name on deadline cards

## 2026-05-17
- screens/admin/*: Claude — Make all admin panel UI consistently bilingual (English / Deutsch) — labels, dialog titles, alerts, snackbars, and action buttons
- LoginScreen.js, App.js, services/auth.js, components/Sidebar.js, navigation/RootNavigator.js: Claude — Wire up admin feature: call checkAdminStatus after login and session restore, clear on logout, register AdminStack in navigator, add gated Admin Panel entry in Sidebar

## 2026-05-20
- services/news.js: Claude Sonnet 4.6 — Fix ReferenceError: results is not defined (renamed variable after concurrentSettled refactor; correct to sources.some())
- services/contentService.js: Claude Sonnet 4.6 — Fix withFallback caching empty Supabase arrays and bypassing local JSON; now falls back to stale cache or bundled data when Supabase table is unpopulated

## 2026-04-28
- README.md: GitHub Copilot — Created initial project README and AI tracking instructions

[Add more entries below as you use AI for different features.]

## 2026-05-14 (session 2)
- components/BiometricLockScreen.js: Claude Sonnet 4.6 — New component: full-screen biometric lock with 3-fail auto-logout
- App.js: Claude Sonnet 4.6 — AppState listener to lock app after 30s in background when biometric lock enabled
- store/useStore.js: Claude Sonnet 4.6 — Added biometricLockEnabled to persisted settings
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Added biometric lock toggle (hidden on devices without enrolled biometrics)
- screens/LoginScreen.js: Claude Sonnet 4.6 — Accessibility labels on username, password, login button
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — Accessibility labels on quick links, news bell, menu button, cards, see-all links
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Accessibility labels on filter chips, checkbox, card body, delete button, FAB
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Accessibility labels on inputs, course suggestions, category chips, save button
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — Accessibility labels on day selector, filter chips, contact button
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Accessibility labels on all tool cards
- components/Sidebar.js: Claude Sonnet 4.6 — Accessibility labels on close button, nav items, logout button
- navigation/MainTabs.js: Claude Sonnet 4.6 — tabBarAccessibilityLabel on all four tabs; menu button labelled

## 2026-05-17
- screens/collaboration/CampusPlatformsScreen.js: Claude Sonnet 4.6 — New screen: in-app launcher for Mattermost, BigBlueButton and Microsoft Teams via expo-web-browser (SFSafariViewController); collapsible course name copier and setup tips
- navigation/ToolsStack.js: Claude Sonnet 4.6 — Added CampusPlatforms route
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Added Campus Platforms card
- CLAUDE.md: Claude Sonnet 4.6 — Added admin panel, biometric lock, navigationRef, datetime utils, missing Supabase tables, withFallback pattern name

## 2026-05-14
- CLAUDE.md: Claude Sonnet 4.6 — Expanded codebase guide: screen data-fetch pattern, notifications section, complete data/ inventory, Supabase table list, key dependencies, app config highlights, all three EAS build profiles
- components/SimpleDatePicker.js: Claude Sonnet 4.6 — Replaced custom chevron-spinner with @react-native-community/datetimepicker (native OS picker on iOS and Android)
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Fixed persistence desync (save from Zustand store instead of re-reading AsyncStorage); added deadline categories (Academic/Bureaucratic/Personal) with color-coded chip selector
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Fixed stale list with useFocusEffect; added category filter tabs and colored category pills on each card
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Activated Deadline Planner and Campus Resources (moved from Coming Soon to live tools list)
- data/events_sports.json, data/events_campus.json: Claude Sonnet 4.6 — Verified SoSe 26 hall schedule and Eventkalender data; seeded Supabase sports_schedule and campus_events tables via SQL

## 2026-04-28
- GuideScreen.js, GuideDetailScreen.js: GitHub Copilot — Added Contacts section with clickable email links

## 2026-05-01
- constants/colors.js: Claude — Added ACCENT and TEXT_SECONDARY tokens; color system documentation
- screens/legal/ImpressumScreen.js: Claude — New screen (DSGVO/TMG compliance)
- screens/legal/DatenschutzScreen.js: Claude — New screen (DSGVO compliance, Art. 13 transparency)
- screens/LoginScreen.js: Claude — Added unofficial app disclaimer
- screens/profile/SettingsScreen.js: Claude — Added Legal section with Impressum and Datenschutz navigation
- navigation/RootNavigator.js: Claude — Registered Impressum and Datenschutz screens
- components/CourseCard.js: Claude — Press scale animation (Animated API)
- components/NewsCard.js: Claude — Press scale animation (Animated API)
- screens/home/HomeScreen.js: Claude — Gradient header (expo-linear-gradient), FadeSlide content animation, color fixes (PRIMARY→DARK for text), ACCENT quick links background, press scale on quick links
- screens/courses/CoursesScreen.js: Claude — FadeSlide animation on content load

## 2026-05-03 — Navigation Restructure + New Features (Claude)

### Navigation Architecture
- navigation/navigationRef.js: Claude — Created `createNavigationContainerRef` for navigation from outside React tree (used by Sidebar)
- App.js: Claude — Added `SafeAreaProvider` wrapper, attached `navigationRef` to `NavigationContainer`, rendered `<Sidebar />` outside NavigationContainer as a global overlay
- navigation/MainTabs.js: Claude — Restructured to 4 tabs (Home / Tools / Guide / Map), removed Profile tab, added `MenuButton` (hamburger) as `headerRight` on all tab headers
- navigation/RootNavigator.js: Claude — Added Profile as root stack screen accessible from Sidebar; added `MenuButton` to Settings, NewsFeed, CoursesList, CourseDetail, Profile headers
- navigation/ToolsStack.js: Claude — Created new stack navigator (ToolsHome → Timetable, Mensa, SemesterCalendar, ExamTracker, ExamPlanner, CampusResources, PlannerList, AddDeadline) with `MenuButton` on all screens
- navigation/GuideStack.js: Claude — Added `MenuButton` as headerRight to GuideHome and GuideDetail

### New Components
- components/Sidebar.js: Claude — Right-slide modal sidebar with spring animation; sections: user avatar/name, tab navigation (Home/Tools/Guide/Map), Account (Profile/Settings), Quick Links (QIS/Student Portal), Logout with Alert confirmation; uses `navigationRef` for navigation
- components/SimpleDatePicker.js: Claude — Custom date + time picker using React Native Modal + SpinColumn (chevron-based spin wheels); exports `SimpleDatePicker` and `SimpleTimePicker`; built to avoid missing `@react-native-community/datetimepicker` dependency

### State Management
- store/useStore.js: Claude — Added sidebar state (`sidebarOpen`, `openSidebar`, `closeSidebar`), deadlines state (`deadlines[]`, `setDeadlines`, `addDeadline`, `updateDeadline`, `removeDeadline`), exam tracking (`examRegistrations{}`, `setExamRegistrations`, `setExamRegistration`), exam plans (`examPlans{}`, `setExamPlans`, `setExamPlan`)

### Screen Changes
- screens/home/HomeScreen.js: Claude — Added hamburger icon to gradient header; updated QUICK_LINKS Timetable to navigate into ToolsStack (`Tools → Timetable`); fixed "Next Class" card navigation
- screens/profile/ProfileScreen.js: Claude — Moved from tab to root stack; added `PORTAL_LINKS` array with QIS (`https://qis.hochschule-trier.de/`) and Student Portal URLs as tappable cards; removed logout (moved to Sidebar)
- screens/timetable/TimetableScreen.js: Claude — Fixed navigation depth after move into ToolsStack: `navigateToBuilding` → `navigation.getParent()?.navigate('Map')`; `openCourseDetail` → `navigation.getParent()?.getParent()?.navigate('CourseDetail', ...)`
- screens/tools/ToolsScreen.js: Claude — Created tools hub with 7 active tools (Timetable, Mensa, Semester Planner, Exam Registration, Events, Courses, News) and 2 coming-soon items (Deadline Planner, Campus Resources) shown with dashed border + "Soon" badge

### New Screens
- screens/mensa/MensaScreen.js: Claude — Weekly mensa menu; day selector (Mon–Fri, today pre-selected); Vegan Monday banner; dietary filter chips (All/Vegan/Vegetarian); bilingual dish names (DE+EN); 3-tier pricing (student/employee/guest)
- screens/calendar/SemesterCalendarScreen.js: Claude — 3-tab semester planning hub: (1) Overview with exam-reg alert banner + horizontal milestone cards + upcoming events + QIS/Portal quick actions; (2) Key Dates with category filter + countdown chips + expandable descriptions; (3) My Courses showing current semester courses from Zustand + exam planning reminders
- screens/exams/ExamTrackerScreen.js: Claude — Per-course exam registration toggle with progress bar; auto-detects current semester from Zustand courses; QIS deeplink button; deadline banner from semester_calendar.json (urgent ≤7 days)
- screens/exams/ExamPlannerScreen.js: Claude — Exam detail form per course (date, time, room, building with campus search, notes); missing-fields warning banner; reminders toggle (day-before + 2h-before notifications)
- screens/planner/PlannerScreen.js: Claude — Deadline list sorted by urgency; UrgencyBadge; mark-done toggle; delete; FAB to add — currently in "Coming Soon" state in ToolsScreen
- screens/planner/AddDeadlineScreen.js: Claude — Deadline form: title, subject (autocomplete from Zustand courses), date+time (SimpleDatePicker), note (200 char), reminder toggles — currently in "Coming Soon" state
- screens/resources/CampusResourcesScreen.js: Claude — 18 UCB campus resources from umwelt-campus.de; category filter chips; expandable cards with tips + contact links — currently in "Coming Soon" state

### Services & Data
- services/reminders.js: Claude — Added `scheduleDeadlineReminders`, `cancelDeadlineReminders`, `scheduleExamReminders`, `cancelExamReminders`; AsyncStorage helpers: `loadDeadlines`, `saveDeadlines`, `loadExamData`, `saveExamRegistrations`, `saveExamPlans`
- services/buildings.js: Claude — `searchBuildings()` fuzzy search over UCB campus building list
- data/mensa_week.json: Claude — Week W19 2026 menu (5 days, Vegan Monday, dietary tags, 3-tier pricing)
- data/semester_calendar.json: Claude — SS 2026 key dates (12 events: lectures, registration windows, holidays, exam periods)
- data/campus_resources.json: Claude — 18 UCB resources (bike rental, repair day, Green Office events, sports, etc.)

### Bug Fixes
- Fixed `@react-native-community/datetimepicker` missing dependency by creating custom `SimpleDatePicker`
- Fixed TimetableScreen navigation depth after moving from direct tab into ToolsStack
- Fixed HomeScreen QUICK_LINKS pointing to removed Timetable tab
- Fixed SafeAreaProvider missing (Sidebar used `useSafeAreaInsets` outside NavigationContainer)

## 2026-05-20 — Security & Compliance hardening
### New Files
- utils/concurrentMap.js: Claude Sonnet 4.6 — concurrentMap + concurrentSettled utilities; cap Stud.IP parallel requests at 3
- supabase/functions/check-admin/index.ts: Claude Sonnet 4.6 — Deno Edge Function; validates Stud.IP credentials then checks admin_users with service_role key (never exposes table to anon)

### Services
- services/auth.js: Claude Sonnet 4.6 — Session expiry (7 days), saveCredentials() helper, WHEN_UNLOCKED_THIS_DEVICE_ONLY SecureStore option, _deleteCredentials() utility
- services/api.js: Claude Sonnet 4.6 — Handle HTTP 429 (RATE_LIMITED) in classifyError
- services/events.js: Claude Sonnet 4.6 — Replace Promise.all with concurrentMap(limit=3)
- services/news.js: Claude Sonnet 4.6 — Restructure to fire personal+global news eagerly and course news via concurrentSettled(limit=3); was firing all N+2 requests simultaneously
- services/bootstrap.js: Claude Sonnet 4.6 — Add _inflightBootstrap deduplication guard; concurrent callers share one in-flight bootstrap

### Store
- store/useAdminStore.js: Claude Sonnet 4.6 — Admin check via Supabase Edge Function (check-admin) instead of direct table query; admin_users table now inaccessible to anon client

### Screens
- screens/LoginScreen.js: Claude Sonnet 4.6 — Rate limiting: 3 failed AUTH_FAILED attempts → 30s lockout with countdown; use saveCredentials() from auth.js
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — "Delete all my data" danger action; clears user-created keys + cache + logout
- screens/legal/DatenschutzScreen.js: Claude Sonnet 4.6 — Accurate third-party disclosure (Supabase, Expo); correct cache TTL; separate Datenweitergabe section
- App.js: Claude Sonnet 4.6 — First-run privacy notice modal (ucb_privacy_v1 flag); only shown once

### Config
- constants/config.js: Claude Sonnet 4.6 — NEWS TTL 15min → 1 hour; add SESSION_MAX_AGE (7 days)

## 2026-05-20 — Archive admin, clean code
- _archive/admin/: Claude Sonnet 4.6 — Moved screens/admin/, navigation/AdminStack.js, store/useAdminStore.js, supabase/functions/check-admin/ to _archive/admin/ — admin panel shelved until needed
- components/Sidebar.js: Claude Sonnet 4.6 — Removed useAdminStore import and Admin section
- navigation/RootNavigator.js: Claude Sonnet 4.6 — Removed AdminStack import and Admin screen registration
- screens/LoginScreen.js: Claude Sonnet 4.6 — Removed checkAdminStatus call
- services/auth.js: Claude Sonnet 4.6 — Removed useAdminStore import and clearAdminStatus call
- App.js: Claude Sonnet 4.6 — Removed useAdminStore import and checkAdminStatus call
