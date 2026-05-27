// Firestore-backed content service following the same offline-first pattern as
// contentService.js: Firestore → AsyncStorage cache (ucb_remote_${cacheKey}) →
// bundled JSON localFallback.
//
// All functions degrade silently in Expo Go (isFirebaseAvailable() returns false)
// and fall through to AsyncStorage cache or bundled fallback data.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, isFirebaseAvailable } from './firebase';

async function withFirestoreFallback(collectionPath, fetcher, cacheKey, localFallback) {
  if (isFirebaseAvailable()) {
    try {
      const data = await fetcher(getFirestore(), collectionPath);
      if (!Array.isArray(data) || data.length > 0) {
        await AsyncStorage.setItem(`ucb_remote_${cacheKey}`, JSON.stringify(data));
        return { data, isOffline: false };
      }
    } catch (err) {
      console.warn(`[firestoreService] "${cacheKey}":`, err?.message ?? err);
    }
  }

  const cached = await AsyncStorage.getItem(`ucb_remote_${cacheKey}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed) || parsed.length > 0) return { data: parsed, isOffline: true };
    } catch {}
  }

  try { return { data: localFallback(), isOffline: true }; }
  catch { return { data: [], isOffline: true }; }
}

// Add Firestore-backed functions here as collections are populated in the Firebase Console.
// Pattern mirrors contentService.js — import this file from screens the same way.

export async function getAnnouncements() {
  return withFirestoreFallback(
    'announcements',
    async (db, path) => {
      const snap = await db.collection(path).orderBy('createdAt', 'desc').limit(20).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    'firestore_announcements',
    () => []
  );
}
