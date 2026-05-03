import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './navigation/RootNavigator';
import Sidebar from './components/Sidebar';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import { PRIMARY, DARK } from './constants/colors';
import { bootstrapSessionData } from './services/bootstrap';

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

  useEffect(() => {
    initializeApp();
  }, []);

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
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
        <Sidebar />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
