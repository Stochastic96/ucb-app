import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Auth
  isLoggedIn: false,
  userId: null,
  user: null,
  setUser: (user) => set({ user, userId: user?.id ?? null, isLoggedIn: true }),
  clearUser: () =>
    set({
      isLoggedIn: false,
      userId: null,
      user: null,
      courses: [],
      events: [],
      news: [],
      unreadNewsCount: 0,
      isOffline: false,
      offlineQueueSize: 0,
      pendingMapBuilding: null,
      isHydrating: false,
      dataReady: false,
      bootstrapError: null,
      lastSyncAt: null,
      currentSemester: null,
      deadlines: [],
      examRegistrations: {},
      examPlans: {},
      goingEventIds: [],
      goingSportIds: [],
    }),

  // Current semester (set from Stud.IP /semesters at bootstrap)
  currentSemester: null,
  setCurrentSemester: (s) => set({ currentSemester: s }),

  // Courses
  courses: [],
  setCourses: (courses) => set({ courses }),
  getCourseById: (id) => get().courses.find((c) => c.id === id) ?? null,

  // Events (timetable)
  events: [],
  setEvents: (events) => set({ events }),

  // News
  news: [],
  setNews: (news) => set({ news }),
  unreadNewsCount: 0,
  setUnreadCount: (n) => set({ unreadNewsCount: n }),
  markNewsRead: (timestamp = Date.now()) =>
    set({ unreadNewsCount: 0, lastNewsSeenAt: timestamp }),

  // Settings (persisted to AsyncStorage 'ucb_settings')
  settings: { notificationsEnabled: false, biometricLockEnabled: false, analyticsEnabled: false, themePreference: 'light' },
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  // Active UI language ('en' | 'de'). Mirrors services/i18n's module-level
  // language; changing it triggers a soft remount of the app tree in App.js
  // (key={language}) so every t() re-reads — no hard app restart.
  language: 'en',
  setLanguage: (language) => set({ language }),

  // Offline
  isOffline: false,
  setOffline: (v) => set({ isOffline: v }),
  offlineQueueSize: 0,
  setOfflineQueueSize: (n) => set({ offlineQueueSize: n }),
  offlineQueueDrainError: null,
  setOfflineQueueDrainError: (error) => set({ offlineQueueDrainError: error }),

  // Session hydration
  isHydrating: false,
  setHydrating: (v) => set({ isHydrating: v }),
  dataReady: false,
  setDataReady: (v) => set({ dataReady: v }),
  bootstrapError: null,
  setBootstrapError: (error) => set({ bootstrapError: error }),
  lastSyncAt: null,
  setLastSyncAt: (value) => set({ lastSyncAt: value }),
  lastNewsSeenAt: 0,

  // Sidebar
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),

  // Deadline planner (persisted to AsyncStorage 'ucb_deadlines')
  deadlines: [],
  setDeadlines: (deadlines) => set({ deadlines }),
  addDeadline: (d) => set((s) => ({ deadlines: [d, ...s.deadlines] })),
  updateDeadline: (id, patch) =>
    set((s) => ({ deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  removeDeadline: (id) => set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) })),

  // Exam registration tracking (persisted to AsyncStorage 'ucb_exam_reg')
  examRegistrations: {},
  setExamRegistrations: (r) => set({ examRegistrations: r }),
  setExamRegistration: (courseId, data) =>
    set((s) => ({ examRegistrations: { ...s.examRegistrations, [courseId]: data } })),

  // Exam plans (persisted to AsyncStorage 'ucb_exam_plans')
  examPlans: {},
  setExamPlans: (p) => set({ examPlans: p }),
  setExamPlan: (courseId, data) =>
    set((s) => ({ examPlans: { ...s.examPlans, [courseId]: data } })),

  // Deep-link: Timetable → Map
  pendingMapBuilding: null,
  setPendingMapBuilding: (id) => set({ pendingMapBuilding: id }),
  clearPendingMapBuilding: () => set({ pendingMapBuilding: null }),

  // Going / reminders (persisted via AsyncStorage in services/reminders.js)
  goingEventIds: [],
  goingSportIds: [],
  setGoingEventIds: (ids) => set({ goingEventIds: ids }),
  setGoingSportIds: (ids) => set({ goingSportIds: ids }),
  addGoingEvent: (id) =>
    set((s) => ({ goingEventIds: s.goingEventIds.includes(id) ? s.goingEventIds : [...s.goingEventIds, id] })),
  removeGoingEvent: (id) =>
    set((s) => ({ goingEventIds: s.goingEventIds.filter((x) => x !== id) })),
  addGoingSport: (id) =>
    set((s) => ({ goingSportIds: s.goingSportIds.includes(id) ? s.goingSportIds : [...s.goingSportIds, id] })),
  removeGoingSport: (id) =>
    set((s) => ({ goingSportIds: s.goingSportIds.filter((x) => x !== id) })),
}));

export default useStore;
