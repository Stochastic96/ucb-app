import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, useColorScheme, Text, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer as NavContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, resolveThemeMode } from './theme/ThemeProvider';
import { MotionProvider } from './theme/MotionProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppFonts } from './theme/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import RootNavigator from './navigation/RootNavigator';
import Sidebar from './components/Sidebar';
import BiometricLockScreen from './components/BiometricLockScreen';
import ErrorOverlay from './components/ErrorOverlay';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import { PRIMARY, DARK, FONTS } from './constants/colors';
import { STORAGE_KEYS } from './constants/storageKeys';
import { SECURE_KEYS } from './constants/secureKeys';
import { bootstrapSessionData, hydrateStoreFromCache } from './services/bootstrap';
import { clearCachedCredentials } from './services/api';
import { initLanguage, getLanguage } from './services/i18n';
import { initOfflineQueue } from './services/offlineQueue';
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

// Cap OS text scaling app-wide so accessibility "largest text" doesn't break
// dense layouts; dense rows (timetable grid, badges) apply a tighter cap
// per-component. Under React 19 (RN 0.81) defaultProps is IGNORED for
// function/forwardRef components, so setting Text.defaultProps alone is a no-op.
// Patch the forwardRef render to inject the cap when a component hasn't set its
// own maxFontSizeMultiplier. Guarded so any future RN internals change falls
// back to the legacy defaultProps path instead of crashing at startup.
const FONT_SCALE_CAP = 1.4;
function capFontScaling(Component, cap) {
  const original = Component && Component.render;
  if (typeof original !== 'function' || Component.__fontCapPatched) return false;
  Component.render = function (props, ref) {
    const el = original.call(this, props, ref);
    if (el && el.props && el.props.maxFontSizeMultiplier == null) {
      return React.cloneElement(el, { maxFontSizeMultiplier: cap });
    }
    return el;
  };
  Component.__fontCapPatched = true;
  return true;
}
try {
  const patchedText = capFontScaling(Text, FONT_SCALE_CAP);
  const patchedInput = capFontScaling(TextInput, FONT_SCALE_CAP);
  if (!patchedText) Text.defaultProps = { ...Text.defaultProps, maxFontSizeMultiplier: FONT_SCALE_CAP };
  if (!patchedInput) TextInput.defaultProps = { ...TextInput.defaultProps, maxFontSizeMultiplier: FONT_SCALE_CAP };
} catch (e) {
  Text.defaultProps = { ...Text.defaultProps, maxFontSizeMultiplier: FONT_SCALE_CAP };
  TextInput.defaultProps = { ...TextInput.defaultProps, maxFontSizeMultiplier: FONT_SCALE_CAP };
}

// Paper (MD3) renders its own text variants, so the app fonts must also be
// registered here. Every override sets fontWeight 'normal': the weight lives
// in the family name, and Android falls back to the system font when a custom
// fontFamily is combined with a non-normal fontWeight.
const paperFonts = configureFonts({
  config: {
    fontFamily: FONTS.body,
    titleLarge: { fontFamily: FONTS.displaySemiBold, fontWeight: 'normal' },
    titleMedium: { fontFamily: FONTS.displaySemiBold, fontWeight: 'normal' },
    bodyMedium: { fontFamily: FONTS.body, fontWeight: 'normal' },
    bodySmall: { fontFamily: FONTS.body, fontWeight: 'normal' },
    labelLarge: { fontFamily: FONTS.bodySemiBold, fontWeight: 'normal' },
  },
});

const ucbTheme = {
  ...MD3LightTheme,
  fonts: paperFonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: PRIMARY,
    secondary: DARK,
  },
};

const ucbDarkTheme = {
  ...MD3DarkTheme,
  fonts: paperFonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7FBF4D',
    secondary: PRIMARY,
  },
};

export default function App() {
  const { updateSettings, setUser } = useStore();
  const language = useStore((s) => s.language);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const bootstrapError = useStore((s) => s.bootstrapError);
  const themePreference = useStore((s) => s.settings?.themePreference ?? 'light');
  const systemScheme = useColorScheme();
  const resolvedMode = resolveThemeMode(themePreference, systemScheme);
  const paperTheme = resolvedMode === 'dark' ? ucbDarkTheme : ucbTheme;
  const [languageReady, setLanguageReady] = useState(false);
  const [onboardReady, setOnboardReady] = useState(false);
  const fontsReady = useAppFonts();
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
    // First-run flag decides whether RootNavigator opens with onboarding or
    // login — resolved before the navigator renders so nothing flashes.
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED)
      .then((v) => useStore.getState().setOnboarded(!!v))
      .catch(() => {})
      .finally(() => setOnboardReady(true));
    initOfflineQueue();
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
      logger.info('App', 'Starting initialization');
      await loadSettings();

      // Cold-start biometric gate: check SecureStore instead of AsyncStorage settings
      // to prevent bypass tampering.
      const secureBiometricEnabled = await SecureStore.getItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED);
      if (secureBiometricEnabled === 'true') {
        const storedUsername = await SecureStore.getItemAsync(SECURE_KEYS.USERNAME);
        if (storedUsername) {
          logger.info('App', 'Biometric lock enabled, showing lock screen');
          pendingSessionRestoreRef.current = true;
          setIsLocked(true);
          return;
        }
      }

      logger.info('App', 'Checking for existing session');
      await checkExistingSession();
      await finishAppInit();
      logger.info('App', 'Initialization complete');
    } catch (err) {
      logger.error('App', 'Initialization failed', err);
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
        useStore.setState({ user: result.user, userId: result.user.id });
        if (result.isOffline) {
          useStore.getState().setOffline(true);
        }

        // Eagerly hydrate from cache so user sees their data immediately
        const hasCache = await hydrateStoreFromCache();

        if (hasCache) {
          // Transition user to Main screen instantly with cached data
          setUser(result.user);
          logger.info('Auth', 'Session restored, transitioned user immediately');

          // Run bootstrap in background to fetch fresh data
          bootstrapSessionData().catch((bootstrapError) => {
            logger.warn('Bootstrap', 'Background sync failed', bootstrapError);
          });
        } else {
          // No cache available, we must await the bootstrap to load data before transitioning
          logger.info('Auth', 'No cache available, awaiting bootstrap sync');
          try {
            await bootstrapSessionData();
            setUser(result.user);
            logger.info('Auth', 'Session restored and data bootstrapped (no cache)');
          } catch (bootstrapError) {
            const errorMsg = bootstrapError?.message || bootstrapError?.type || 'Failed to load your course data';
            logger.error('Bootstrap', 'Failed during session restore (no cache)', { error: errorMsg, type: bootstrapError?.type });
            useStore.getState().setBootstrapError({
              message: errorMsg,
              type: bootstrapError?.type ?? 'UNKNOWN',
            });
            setUser(result.user); // still transition so the error overlay is shown
          }
        }
      }
    } catch (authError) {
      logger.warn('Auth', 'Restore session failed', { error: authError?.message });
      // Silent failure on login restore is OK — user will see login screen
    }
  };

  if (!languageReady || !fontsReady || !onboardReady) return null;

  const displayError = initError || bootstrapError;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <MotionProvider>
        <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
        <PaperProvider theme={paperTheme}>
          <NavContainer ref={navigationRef}>
          <RootNavigator />
          {/* Sidebar and modals inside NavigationContainer to access useNavigation() */}
          <Sidebar key={`sidebar-${language}`} />
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
        </MotionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
