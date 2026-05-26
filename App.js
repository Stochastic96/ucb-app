import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer as NavContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import RootNavigator from './navigation/RootNavigator';
import Sidebar from './components/Sidebar';
import BiometricLockScreen from './components/BiometricLockScreen';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import { PRIMARY, DARK } from './constants/colors';
import { STORAGE_KEYS } from './constants/storageKeys';
import { SECURE_KEYS } from './constants/secureKeys';
import { bootstrapSessionData } from './services/bootstrap';
import { clearCachedCredentials } from './services/api';

// Navigate to the relevant screen based on the notification identifier prefix.
// Only uses the identifier (not notification content) to avoid handling personal data.
function navigateFromNotification(identifier) {
  if (!identifier || !navigationRef.current?.isReady()) return;
  if (identifier.startsWith('deadline_')) {
    navigationRef.current.navigate('Main', { screen: 'Tools', params: { screen: 'PlannerList' } });
  } else if (identifier.startsWith('exam_')) {
    navigationRef.current.navigate('Main', { screen: 'Tools', params: { screen: 'ExamTracker' } });
  } else if (identifier.startsWith('event_') || identifier.startsWith('sport_')) {
    navigationRef.current.navigate('EventsList');
  }
}

const LOCK_GRACE_MS = 30 * 1000; // 30 seconds in background before locking

const ucbTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: PRIMARY,
    secondary: DARK,
  },
};

export default function App() {
  const { updateSettings, setUser } = useStore();
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAt = useRef(null);
  const appState = useRef(AppState.currentState);
  // Set when cold-start biometric gate is active — session restore runs after unlock
  const pendingSessionRestoreRef = useRef(false);

  useEffect(() => {
    initializeApp();
  }, []);

  // Handle notification taps while the app is running or backgrounded
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response.notification.request.identifier);
    });
    return () => sub.remove();
  }, []);

  // Single AppState listener — reads current settings from store to avoid closure stale value
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextState) => {
    appState.current = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      backgroundedAt.current = Date.now();
      // Remove password from JS heap while app is not in foreground
      clearCachedCredentials();
    } else if (nextState === 'active') {
      const { settings, isLoggedIn } = useStore.getState();
      if (
        settings.biometricLockEnabled &&
        isLoggedIn &&
        backgroundedAt.current !== null &&
        Date.now() - backgroundedAt.current > LOCK_GRACE_MS
      ) {
        setIsLocked(true);
      }
      backgroundedAt.current = null;
    }
  };

  const handleUnlock = useCallback(async () => {
    setIsLocked(false);
    if (pendingSessionRestoreRef.current) {
      pendingSessionRestoreRef.current = false;
      await checkExistingSession();
      await finishAppInit();
    }
  }, []);

  const finishAppInit = async () => {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse?.notification?.request?.identifier) {
      navigateFromNotification(lastResponse.notification.request.identifier);
    }
  };

  const initializeApp = async () => {
    await loadSettings();

    // Cold-start biometric gate: if biometric lock is enabled and credentials exist,
    // show the lock screen before restoring the session.
    const { settings } = useStore.getState();
    if (settings.biometricLockEnabled) {
      const storedUsername = await SecureStore.getItemAsync(SECURE_KEYS.USERNAME);
      if (storedUsername) {
        pendingSessionRestoreRef.current = true;
        setIsLocked(true);
        return;
      }
    }

    await checkExistingSession();
    await finishAppInit();
  };

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) updateSettings(JSON.parse(raw));
    } catch {
      // first launch — no settings yet
    }
  };

  const checkExistingSession = async () => {
    try {
      const { checkExistingSession: restoreSession } = await import('./services/auth');
      const result = await restoreSession();
      if (result.valid && result.user) {
        setUser(result.user);
        try {
          await bootstrapSessionData();
        } catch {}
      }
    } catch {}
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={ucbTheme}>
        <NavContainer ref={navigationRef}>
          <RootNavigator />
        </NavContainer>
        <Sidebar />
        {isLocked && (
          <BiometricLockScreen onUnlock={handleUnlock} />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
