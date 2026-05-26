// Single source of truth for all AsyncStorage key strings.
// cache.js's NON_CACHE_KEYS must reference these — never use raw strings elsewhere.
export const STORAGE_KEYS = {
  SETTINGS: 'ucb_settings',
  NEWS_LAST_SEEN: 'ucb_news_last_seen_at',
  DEADLINES: 'ucb_deadlines',
  EXAM_REGISTRATIONS: 'ucb_exam_reg',
  EXAM_PLANS: 'ucb_exam_plans',
  GOING_STATE: 'ucb_going_state',
};
