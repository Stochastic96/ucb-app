import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Auth
  isLoggedIn: false,
  userId: null,
  user: null,
  setUser: (user) => set({ user, userId: user?.id ?? null, isLoggedIn: true }),
  clearUser: () => set({ user: null, userId: null, isLoggedIn: false }),

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
  markNewsRead: () => set({ unreadNewsCount: 0 }),

  // Settings (persisted to AsyncStorage 'ucb_settings')
  settings: { notificationsEnabled: false },
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  // Offline
  isOffline: false,
  setOffline: (v) => set({ isOffline: v }),

  // Deep-link: Timetable → Map
  pendingMapBuilding: null,
  setPendingMapBuilding: (id) => set({ pendingMapBuilding: id }),
  clearPendingMapBuilding: () => set({ pendingMapBuilding: null }),
}));

export default useStore;
