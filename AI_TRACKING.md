# AI Usage Log

Document which AI (Copilot, Claude, Codex, etc.) contributed to which part of the codebase. Add a new entry each time an AI helps with a feature or file.

## 2026-04-28
- README.md: GitHub Copilot — Created initial project README and AI tracking instructions

[Add more entries below as you use AI for different features.]

## 2026-05-14
- CLAUDE.md: Claude Sonnet 4.6 — Expanded codebase guide: screen data-fetch pattern, notifications section, complete data/ inventory, Supabase table list, key dependencies, app config highlights, all three EAS build profiles

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
