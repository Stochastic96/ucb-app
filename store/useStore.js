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
      pendingMapBuilding: null,
      isHydrating: false,
      dataReady: false,
      bootstrapError: null,
      lastSyncAt: null,
    }),

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
  settings: { notificationsEnabled: false },
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  // Offline
  isOffline: false,
  setOffline: (v) => set({ isOffline: v }),

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
