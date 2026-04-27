const DIRECT_STUDIP_BASE_URL = 'https://studip.hochschule-trier.de/jsonapi.php/v1';

export const BASE_URL = process.env.EXPO_PUBLIC_STUDIP_BASE_URL || DIRECT_STUDIP_BASE_URL;
export const STUDIP_WEB_URL = 'https://studip.hochschule-trier.de/index.php';
export const STUDIP_LOCAL_LOGIN_URL = 'https://studip.hochschule-trier.de/index.php?again=yes';

export const CACHE_TTL = {
  PROFILE: 60 * 60 * 1000,          // 1 hour
  COURSES: 24 * 60 * 60 * 1000,     // 24 hours
  EVENTS: 6 * 60 * 60 * 1000,       // 6 hours
  NEWS: 15 * 60 * 1000,             // 15 minutes
  FILES: 12 * 60 * 60 * 1000,       // 12 hours
  ANNOUNCEMENTS: 60 * 60 * 1000,    // 1 hour
};
