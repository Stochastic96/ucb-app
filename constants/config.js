export const BASE_URL = 'https://studip.hochschule-trier.de/jsonapi.php/v1';

export const CACHE_TTL = {
  PROFILE: 60 * 60 * 1000,          // 1 hour
  COURSES: 24 * 60 * 60 * 1000,     // 24 hours
  EVENTS: 6 * 60 * 60 * 1000,       // 6 hours
  NEWS: 15 * 60 * 1000,             // 15 minutes
  FILES: 12 * 60 * 60 * 1000,       // 12 hours
  ANNOUNCEMENTS: 60 * 60 * 1000,    // 1 hour
};
