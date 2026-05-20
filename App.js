import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer as NavContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme, Modal, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import RootNavigator from './navigation/RootNavigator';
import Sidebar from './components/Sidebar';
import BiometricLockScreen from './components/BiometricLockScreen';
import { navigationRef } from './navigation/navigationRef';
import useStore from './store/useStore';
import { PRIMARY, DARK, INACTIVE, BG, BORDER } from './constants/colors';
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
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
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
    // Show first-run privacy notice if the user hasn't seen it yet
    const seen = await AsyncStorage.getItem('ucb_privacy_v1');
    if (!seen) setShowPrivacyNotice(true);
    // Handle cold-start notification tap (app launched by tapping a notification)
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse?.notification?.request?.identifier) {
      navigateFromNotification(lastResponse.notification.request.identifier);
    }
  };

  const handleAcceptPrivacy = async () => {
    await AsyncStorage.setItem('ucb_privacy_v1', '1');
    setShowPrivacyNotice(false);
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
        {/* First-run privacy notice — shown once, above everything */}
        <Portal>
          <Modal
            visible={showPrivacyNotice}
            dismissable={false}
            contentContainerStyle={privacyStyles.modal}
          >
            <Text style={privacyStyles.title}>Datenschutzhinweis</Text>
            <Text style={privacyStyles.subtitle}>UCB Navigator · Informeller Studentenapp</Text>
            <View style={privacyStyles.bullets}>
              <Text style={privacyStyles.bullet}>
                Deine Stud.IP-Zugangsdaten werden ausschließlich an studip.hochschule-trier.de übertragen und sicher auf deinem Gerät gespeichert.
              </Text>
              <Text style={privacyStyles.bullet}>
                Campusinhalte (Mensaplan, Events) werden anonym von Supabase geladen — keine personenbezogenen Daten werden übermittelt.
              </Text>
              <Text style={privacyStyles.bullet}>
                Deine Fristen und Einstellungen bleiben lokal auf deinem Gerät. Kein Tracking, keine Werbung.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigationRef.current?.navigate('Datenschutz')}
              style={privacyStyles.linkBtn}
            >
              <Text style={privacyStyles.linkText}>Vollständige Datenschutzerklärung ansehen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={privacyStyles.acceptBtn} onPress={handleAcceptPrivacy}>
              <Text style={privacyStyles.acceptText}>Verstanden</Text>
            </TouchableOpacity>
          </Modal>
        </Portal>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const privacyStyles = StyleSheet.create({
  modal: {
    backgroundColor: BG,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: INACTIVE,
    marginBottom: 18,
  },
  bullets: {
    gap: 12,
    marginBottom: 20,
  },
  bullet: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: PRIMARY,
  },
  linkBtn: {
    marginBottom: 14,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 13,
    color: PRIMARY,
    textDecorationLine: 'underline',
  },
  acceptBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
