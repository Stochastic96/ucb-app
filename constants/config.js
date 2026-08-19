const DIRECT_STUDIP_BASE_URL = 'https://studip.hochschule-trier.de/jsonapi.php/v1';

export const BASE_URL = process.env.EXPO_PUBLIC_STUDIP_BASE_URL || DIRECT_STUDIP_BASE_URL;
export const STUDIP_WEB_URL = 'https://studip.hochschule-trier.de/index.php';

// Publicly hosted privacy policy — required as store-listing metadata by both
// Google Play and the App Store (the in-app screens alone do not satisfy this).
// Must be reachable without login before submission.
export const PRIVACY_POLICY_URL = 'https://app.ucbnavigator.pages.dev/privacy';
export const STUDIP_LOCAL_LOGIN_URL = 'https://studip.hochschule-trier.de/index.php?again=yes';

export const CACHE_TTL = {
  PROFILE: 60 * 60 * 1000,          // 1 hour
  COURSES: 24 * 60 * 60 * 1000,     // 24 hours
  EVENTS: 6 * 60 * 60 * 1000,       // 6 hours
  NEWS: 60 * 60 * 1000,             // 1 hour (was 15 min — reduces Stud.IP request load)
  FILES: 12 * 60 * 60 * 1000,       // 12 hours
  ANNOUNCEMENTS: 60 * 60 * 1000,    // 1 hour
};

// Sessions older than this are expired and require re-login
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
