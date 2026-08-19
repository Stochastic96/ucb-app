// Single source of truth for all AsyncStorage key strings.
// cache.js's NON_CACHE_KEYS must reference these — never use raw strings elsewhere.
export const STORAGE_KEYS = {
  SETTINGS: 'ucb_settings',
  NEWS_LAST_SEEN: 'ucb_news_last_seen_at',
  DEADLINES: 'ucb_deadlines',
  EXAM_REGISTRATIONS: 'ucb_exam_reg',
  EXAM_PLANS: 'ucb_exam_plans',
  GOING_STATE: 'ucb_going_state',
  FACT_STATE: 'ucb_fact_state',
  OFFLINE_QUEUE: 'ucb_offline_q',
  GUIDE_CHECKLIST: 'ucb_guide_checklist_checked',
  // First-run onboarding: completion flag + "Getting started" checklist state
  ONBOARDED: 'ucb_onboarded',
  FIRST_STEPS: 'ucb_first_steps',
  // Campus Radar: self-authored social profile + local block list (no Stud.IP data)
  CAMPUS_PROFILE: 'ucb_campus_profile',
  CAMPUS_BLOCKED: 'ucb_campus_blocked',
  CAMPUS_CONSENT: 'ucb_campus_consent',
  // Device-local diagnostic logs (services/logger.js). Survives clearAllCache but
  // MUST be erasable by "Delete all data" (Art. 17 DSGVO) — hence a real key, not a literal.
  LOGS: 'ucb_logs',
};
