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
      // Campus Radar live state (campusProfile + blockedPeers persist deliberately)
      radarEnabled: false,
      radarPeers: [],
      chatThreads: {},
      radarUnread: {},
      activeThreadId: null,
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
  settings: { notificationsEnabled: false, biometricLockEnabled: false, themePreference: 'light' },
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

  // ── Campus Radar (serverless Bluetooth socializing) ──────────────────────
  // campusProfile + blockedPeers persist (self-authored / safety data, no Stud.IP);
  // radarEnabled/radarPeers/chatThreads/radarUnread are live session state.
  campusProfile: null, // { username, realName (LOCAL-ONLY, never broadcast), status, origin, interests[], programId, semester, openTo[], speak[], learn[] }
  setCampusProfile: (p) => set({ campusProfile: p }),

  radarEnabled: false,
  setRadarEnabled: (v) => set({ radarEnabled: v }),

  // First-run onboarding (pre-login welcome flow). Loaded from AsyncStorage in
  // App.js before the navigator renders; RootNavigator picks the initial route.
  onboarded: false,
  setOnboarded: (v) => set({ onboarded: !!v }),

  // Ghost mode: browse nearby students + read the Campus Room WITHOUT
  // broadcasting your own presence card, so you never appear in anyone's Nearby
  // list. Safe default = true (discover-but-hidden until the user opts to be seen).
  radarGhost: true,
  setRadarGhost: (v) => set({ radarGhost: v }),

  radarBtState: null, // 'poweredOn' | 'poweredOff' | … | null (from onBluetoothStateChange; null when radar off)
  setRadarBtState: (v) => set({ radarBtState: v }),

  radarPeers: [], // [{ peerId, fingerprint, nick, status, origin, programId, semester, openTo[], speak[], learn[], score, sharedCount, buddyMatch, tandem, sameProgram, sameSemester, verified, proven, realName, myNameShared, connected, rssi, lastSeen }]
  setRadarPeers: (peers) => set({ radarPeers: peers }),
  upsertRadarPeer: (peer) =>
    set((s) => {
      const idx = s.radarPeers.findIndex((p) => p.peerId === peer.peerId);
      if (idx === -1) return { radarPeers: [...s.radarPeers, peer] };
      const next = s.radarPeers.slice();
      next[idx] = { ...next[idx], ...peer };
      return { radarPeers: next };
    }),
  removeRadarPeer: (peerId) =>
    set((s) => ({ radarPeers: s.radarPeers.filter((p) => p.peerId !== peerId) })),
  clearRadarPeers: () => set({ radarPeers: [] }),

  // { 'room' | peerId: [{ id, kind? ('wave'|'name'|undefined=text), fingerprint, nick, text, ts, mine, verified,
  //   status? ('sending'|'sent'|'delivered'|'read'|'failed' — mine-in-DM only) }] }
  // Threads are capped so a long Campus Room session can never grow unbounded.
  chatThreads: {},
  appendChatMessage: (threadId, msg) =>
    set((s) => ({
      chatThreads: {
        ...s.chatThreads,
        [threadId]: [...(s.chatThreads[threadId] ?? []), msg].slice(-200),
      },
      radarUnread:
        threadId === s.activeThreadId
          ? s.radarUnread
          : { ...s.radarUnread, [threadId]: (s.radarUnread[threadId] ?? 0) + (msg.mine ? 0 : 1) },
    })),
  updateChatMessage: (threadId, msgId, patch) =>
    set((s) => {
      const thread = s.chatThreads[threadId];
      if (!thread) return {};
      const idx = thread.findIndex((m) => m.id === msgId);
      if (idx === -1) return {};
      const next = thread.slice();
      next[idx] = { ...next[idx], ...patch };
      return { chatThreads: { ...s.chatThreads, [threadId]: next } };
    }),
  removeChatMessage: (threadId, msgId) =>
    set((s) => {
      const thread = s.chatThreads[threadId];
      if (!thread) return {};
      return { chatThreads: { ...s.chatThreads, [threadId]: thread.filter((m) => m.id !== msgId) } };
    }),
  clearThread: (threadId) =>
    set((s) => {
      const threads = { ...s.chatThreads };
      delete threads[threadId];
      const unread = { ...s.radarUnread };
      delete unread[threadId];
      return { chatThreads: threads, radarUnread: unread };
    }),

  radarUnread: {}, // { threadId: count }
  activeThreadId: null,
  setActiveThreadId: (id) => set({ activeThreadId: id }),
  markThreadRead: (threadId) =>
    set((s) => ({ radarUnread: { ...s.radarUnread, [threadId]: 0 } })),

  blockedPeers: [], // [fingerprint]
  setBlockedPeers: (list) => set({ blockedPeers: list }),
  blockPeer: (fingerprint) =>
    set((s) => ({
      blockedPeers: s.blockedPeers.includes(fingerprint)
        ? s.blockedPeers
        : [...s.blockedPeers, fingerprint],
      radarPeers: s.radarPeers.filter((p) => p.fingerprint !== fingerprint),
    })),
  unblockPeer: (fingerprint) =>
    set((s) => ({ blockedPeers: s.blockedPeers.filter((f) => f !== fingerprint) })),
}));

export default useStore;
