let _analytics = null;
let _crashlytics = null;
let _firestore = null;
let _isFirebaseAvailable = false;

export async function initFirebase() {
  try {
    const { default: auth }        = await import('@react-native-firebase/auth');
    const { default: analytics }   = await import('@react-native-firebase/analytics');
    const { default: crashlytics } = await import('@react-native-firebase/crashlytics');
    const { default: firestore }   = await import('@react-native-firebase/firestore');

    _analytics   = analytics();
    _crashlytics = crashlytics();
    _firestore   = firestore();

    // Enable Firestore offline persistence before any reads/writes.
    await _firestore.settings({ persistence: true });

    // Silent anonymous sign-in — provides a Firebase UID for Firestore security rules.
    // If currentUser already exists (app restart), signInAnonymously is skipped.
    if (!auth().currentUser) {
      await auth().signInAnonymously();
    }

    _isFirebaseAvailable = true;
  } catch (err) {
    // In Expo Go, "Native module not found" is expected — suppress it.
    // In a native build, any other failure is logged for debugging.
    if (!__DEV__ || !String(err?.message).includes('Native module')) {
      console.warn('[firebase] init failed:', err?.message ?? err);
    }
    _isFirebaseAvailable = false;
  }
}

export function getFirestore()        { return _firestore; }
export function getAnalytics()        { return _analytics; }
export function getCrashlytics()      { return _crashlytics; }
export function isFirebaseAvailable() { return _isFirebaseAvailable; }
