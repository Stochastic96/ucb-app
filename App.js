import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer as NavContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import RootNavigator from './navigation/RootNavigator';
import Sidebar from './components/Sidebar';
import BiometricLockScreen from './components/BiometricLockScreen';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import useAdminStore from './store/useAdminStore';
import { PRIMARY, DARK } from './constants/colors';
import { bootstrapSessionData } from './services/bootstrap';

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
  const { updateSettings, setUser, settings, isLoggedIn } = useStore();
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAt = useRef(null);
  const appState = useRef(AppState.currentState);

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [settings.biometricLockEnabled, isLoggedIn]);

  const handleAppStateChange = (nextState) => {
    const prev = appState.current;
    appState.current = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      backgroundedAt.current = Date.now();
    } else if (nextState === 'active') {
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

  const initializeApp = async () => {
    await loadSettings();
    await checkExistingSession();
    // Handle cold-start notification tap (app launched by tapping a notification)
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse?.notification?.request?.identifier) {
      navigateFromNotification(lastResponse.notification.request.identifier);
    }
  };

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem('ucb_settings');
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
        useAdminStore.getState().checkAdminStatus(result.user.username);
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
        {isLocked && isLoggedIn && (
          <BiometricLockScreen onUnlock={() => setIsLocked(false)} />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
