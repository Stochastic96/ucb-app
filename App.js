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
import AnalyticsConsentModal from './components/AnalyticsConsentModal';
import ErrorOverlay from './components/ErrorOverlay';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import { PRIMARY, DARK } from './constants/colors';
import { STORAGE_KEYS } from './constants/storageKeys';
import { SECURE_KEYS } from './constants/secureKeys';
import { bootstrapSessionData } from './services/bootstrap';
import { clearCachedCredentials } from './services/api';
import { startSession, endSession, resumeSession } from './services/analytics';
import { initLanguage, getLanguage } from './services/i18n';
import * as logger from './services/logger';

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
  const language = useStore((s) => s.language);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const bootstrapError = useStore((s) => s.bootstrapError);
  const [languageReady, setLanguageReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [initError, setInitError] = useState(null);
  const backgroundedAt = useRef(null);
  const appState = useRef(AppState.currentState);
  // Set when cold-start biometric gate is active — session restore runs after unlock
  const pendingSessionRestoreRef = useRef(false);

  const handleAppStateChange = (nextState) => {
    appState.current = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      backgroundedAt.current = Date.now();
      clearCachedCredentials();
      // session_end (with engagement duration) on true background; idempotent so
      // repeated inactive/background churn won't emit duplicates.
      endSession();
    } else if (nextState === 'active') {
      resumeSession();
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

  useEffect(() => {
    logger.initLogger().then(() => {
      logger.info('App', 'Application starting');
    });
    initLanguage().then(() => {
      // Mirror the persisted language into the store so a later change can
      // trigger a soft remount (see key={language} below).
      useStore.getState().setLanguage(getLanguage());
      setLanguageReady(true);
      logger.info('App', 'Language initialized', { language: getLanguage() });
    });
    startSession();
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
    try {
      console.log('[App] Starting initialization...');
      await loadSettings();

      // Cold-start biometric gate: if biometric lock is enabled and credentials exist,
      // show the lock screen before restoring the session.
      const { settings } = useStore.getState();
      if (settings.biometricLockEnabled) {
        const storedUsername = await SecureStore.getItemAsync(SECURE_KEYS.USERNAME);
        if (storedUsername) {
          console.log('[App] Biometric lock enabled, showing lock screen');
          pendingSessionRestoreRef.current = true;
          setIsLocked(true);
          return;
        }
      }

      console.log('[App] Checking for existing session...');
      await checkExistingSession();
      await finishAppInit();
      console.log('[App] Initialization complete');
    } catch (err) {
      console.error('[App] Initialization failed:', err);
      setInitError(err?.message || 'Failed to initialize app');
    }
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
        } catch (bootstrapError) {
          console.error('[Bootstrap] Failed:', bootstrapError);
          useStore.getState().setBootstrapError(bootstrapError?.message || 'Failed to load data');
        }
      }
    } catch (authError) {
      console.error('[Auth] Restore session failed:', authError);
      // Silent failure on login restore is OK — user will see login screen
    }
  };

  if (!languageReady) return null;

  const displayError = initError || bootstrapError;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={ucbTheme}>
        <NavContainer ref={navigationRef}>
          <RootNavigator />
          {/* Sidebar and modals inside NavigationContainer to access useNavigation() */}
          <Sidebar key={`sidebar-${language}`} />
          {isLoggedIn && <AnalyticsConsentModal key={`consent-${language}`} />}
          {isLocked && (
            <BiometricLockScreen onUnlock={handleUnlock} />
          )}
          {displayError && (
            <ErrorOverlay
              error={displayError}
              onDismiss={() => {
                setInitError(null);
                useStore.getState().setBootstrapError(null);
              }}
              onRetry={() => {
                setInitError(null);
                useStore.getState().setBootstrapError(null);
                initializeApp();
              }}
            />
          )}
        </NavContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
