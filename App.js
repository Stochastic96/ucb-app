import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer as NavContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './navigation/RootNavigator';
import Sidebar from './components/Sidebar';
import BiometricLockScreen from './components/BiometricLockScreen';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import { PRIMARY, DARK } from './constants/colors';
import { bootstrapSessionData } from './services/bootstrap';

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
