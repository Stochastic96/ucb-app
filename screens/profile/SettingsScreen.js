import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Dialog, Button, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { clearAllCache } from '../../services/cache';
import { logout } from '../../services/auth';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, BG, BORDER, SURFACE } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';

// All user-created data keys that clearAllCache() intentionally preserves
const USER_DATA_KEYS = [
  'ucb_settings',
  'ucb_news_last_seen_at',
  'ucb_deadlines',
  'ucb_exam_reg',
  'ucb_exam_plans',
  'ucb_going_state',
];

export default function SettingsScreen() {
  const { settings, updateSettings } = useStore();
  const navigation = useNavigation();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(hasHardware && isEnrolled);
    })();
  }, []);

  const persistSettings = async (patch) => {
    const next = { ...settings, ...patch };
    await AsyncStorage.setItem('ucb_settings', JSON.stringify(next));
    updateSettings(patch);
  };

  const handleToggleNotifications = (val) => persistSettings({ notificationsEnabled: val });
  const handleToggleBiometric = (val) => persistSettings({ biometricLockEnabled: val });

  const handleClearCache = async () => {
    setShowClearConfirm(false);
    try {
      await clearAllCache();
      setSnackbarMsg('Cache cleared');
      setSnackbarVisible(true);
    } catch {
      setSnackbarMsg('Failed to clear cache');
      setSnackbarVisible(true);
    }
  };

  const handleDeleteAllData = async () => {
    setShowDeleteAllConfirm(false);
    try {
      await logout();
      await AsyncStorage.multiRemove(USER_DATA_KEYS);
      await clearAllCache();
    } catch {
      setSnackbarMsg('Failed to delete data');
      setSnackbarVisible(true);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Map Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Campus navigation</Text>
            <Text style={styles.settingValue}>Using building list and Apple Maps directions</Text>
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications & Security</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable notifications</Text>
          <Switch
            value={settings.notificationsEnabled ?? false}
            onValueChange={handleToggleNotifications}
            trackColor={{ true: PRIMARY }}
            accessibilityLabel="Enable notifications"
            accessibilityRole="switch"
          />
        </View>
        {hasBiometrics && (
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Biometric lock</Text>
              <Text style={styles.settingValue}>Lock app after 30 s in background</Text>
            </View>
            <Switch
              value={settings.biometricLockEnabled ?? false}
              onValueChange={handleToggleBiometric}
              trackColor={{ true: PRIMARY }}
              accessibilityLabel="Biometric lock"
              accessibilityRole="switch"
            />
          </View>
        )}
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={[styles.dangerRow, { marginBottom: 10, borderRadius: 10 }]} onPress={() => setShowClearConfirm(true)}>
          <Ionicons name="refresh-outline" size={20} color="#E65100" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dangerLabel, { color: '#E65100' }]}>Clear cached data</Text>
            <Text style={styles.dangerSub}>Removes Stud.IP data. Personal data kept.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerRow} onPress={() => setShowDeleteAllConfirm(true)}>
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Delete all my data</Text>
            <Text style={styles.dangerSub}>Deletes deadlines, exam plans, settings. Logs out.</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Impressum')}>
          <Ionicons name="document-text-outline" size={18} color={INACTIVE} />
          <Text style={styles.settingLabel}>Impressum</Text>
          <Ionicons name="chevron-forward" size={16} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkRow, { marginBottom: 0 }]} onPress={() => navigation.navigate('Datenschutz')}>
          <Ionicons name="shield-checkmark-outline" size={18} color={INACTIVE} />
          <Text style={styles.settingLabel}>Datenschutzerklärung</Text>
          <Ionicons name="chevron-forward" size={16} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.settingLabel}>API</Text>
          <Text style={styles.settingValue}>Stud.IP v1.0</Text>
        </View>
      </View>

      {/* Clear cache dialog */}
      <Dialog visible={showClearConfirm} onDismiss={() => setShowClearConfirm(false)}>
        <Dialog.Title>Clear cached data?</Dialog.Title>
        <Dialog.Content>
          <Text>Cached Stud.IP data (courses, events, news) will be removed. Your deadlines, exam plans, and personal settings are not affected.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowClearConfirm(false)}>Cancel</Button>
          <Button onPress={handleClearCache} textColor="#E65100">Clear</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete all data dialog */}
      <Dialog visible={showDeleteAllConfirm} onDismiss={() => setShowDeleteAllConfirm(false)}>
        <Dialog.Title>Delete all your data?</Dialog.Title>
        <Dialog.Content>
          <Text>
            This permanently deletes all your deadlines, exam plans, RSVP state, and settings — then logs you out.{'\n\n'}This cannot be undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowDeleteAllConfirm(false)}>Cancel</Button>
          <Button onPress={handleDeleteAllData} textColor="#D32F2F">Delete everything</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000}>
        {snackbarMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: INACTIVE, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  settingRow: { backgroundColor: BG, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BORDER },
  settingLabel: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  settingValue: { fontSize: 13, color: INACTIVE },
  dangerRow: { backgroundColor: BG, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dangerLabel: { fontSize: 15, fontWeight: '500', color: '#D32F2F' },
  dangerSub: { fontSize: 12, color: INACTIVE, marginTop: 2 },
  linkRow: { backgroundColor: BG, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
