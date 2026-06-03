import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Dialog, Button, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { clearAllCache } from '../../services/cache';
import { logout } from '../../services/auth';
import { trackEvent } from '../../services/analytics';
import useStore from '../../store/useStore';
import { PRIMARY, INACTIVE, BG, BORDER, SURFACE } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { getLanguage, saveLanguage, useTranslation } from '../../services/i18n';

// All user-created data keys that clearAllCache() intentionally preserves
const USER_DATA_KEYS = [
  'ucb_settings',
  'ucb_news_last_seen_at',
  'ucb_deadlines',
  'ucb_exam_reg',
  'ucb_exam_plans',
  'ucb_going_state',
  'ucb_offline_q',
];

export default function SettingsScreen() {
  const t = useTranslation();
  const { settings, updateSettings } = useStore();
  const navigation = useNavigation();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showLangConfirm, setShowLangConfirm] = useState(false);
  const [pendingLang, setPendingLang] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const currentLang = getLanguage();

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

  const handleToggleNotifications = (val) => {
    trackEvent('feature_use', 'setting_changed', { setting: 'notificationsEnabled', value: val });
    persistSettings({ notificationsEnabled: val });
  };
  const handleToggleBiometric = (val) => {
    trackEvent('feature_use', 'setting_changed', { setting: 'biometricLockEnabled', value: val });
    persistSettings({ biometricLockEnabled: val });
  };

  const handleLanguagePress = (lang) => {
    if (lang === currentLang) return;
    setPendingLang(lang);
    setShowLangConfirm(true);
  };

  const handleLangConfirm = async () => {
    setShowLangConfirm(false);
    trackEvent('feature_use', 'setting_changed', { setting: 'language', value: pendingLang });
    await saveLanguage(pendingLang);
    // Soft remount: updating the store language re-keys the app tree in App.js
    // so every screen re-reads translations immediately — no app restart.
    useStore.getState().setLanguage(pendingLang);
  };

  const handleClearCache = async () => {
    setShowClearConfirm(false);
    try {
      await clearAllCache();
      // Clearing Stud.IP cache invalidates the session state — log out so the
      // user is taken back to the login screen and data reloads cleanly.
      await logout();
      useStore.getState().clearUser();
    } catch {
      setSnackbarMsg(t('settings_cache_failed'));
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
      setSnackbarMsg(t('settings_delete_failed'));
      setSnackbarVisible(true);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_language')}</Text>
        <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
          <Text style={styles.settingLabel}>{t('settings_language_label')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, currentLang === 'en' && styles.langBtnActive]}
              onPress={() => handleLanguagePress('en')}
              activeOpacity={0.75}
            >
              <Text style={[styles.langBtnText, currentLang === 'en' && styles.langBtnTextActive]}>EN</Text>
              <Text style={[styles.langBtnSub, currentLang === 'en' && styles.langBtnTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, currentLang === 'de' && styles.langBtnActive]}
              onPress={() => handleLanguagePress('de')}
              activeOpacity={0.75}
            >
              <Text style={[styles.langBtnText, currentLang === 'de' && styles.langBtnTextActive]}>DE</Text>
              <Text style={[styles.langBtnSub, currentLang === 'de' && styles.langBtnTextActive]}>Deutsch</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.langNote}>{t('settings_language_restart_note')}</Text>
        </View>
      </View>

      {/* Notifications & Reminders Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_notifications')}</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings_notifications_title')}</Text>
              <Text style={styles.settingDesc}>{t('settings_notifications_desc')}</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled ?? false}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: PRIMARY }}
              accessibilityLabel={t('settings_notifications_title')}
              accessibilityRole="switch"
            />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.helpBanner}>
            <Ionicons name="information-circle-outline" size={15} color={INACTIVE} />
            <Text style={styles.helpText}>{t('settings_notifications_help')}</Text>
          </View>
        </View>
      </View>

      {/* Security & Biometrics Section */}
      {hasBiometrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings_section_security')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings_biometric_title')}</Text>
                <Text style={styles.settingDesc}>{t('settings_biometric_desc')}</Text>
              </View>
              <Switch
                value={settings.biometricLockEnabled ?? false}
                onValueChange={handleToggleBiometric}
                trackColor={{ true: PRIMARY }}
                accessibilityLabel={t('settings_biometric_title')}
                accessibilityRole="switch"
              />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.helpBanner}>
              <Ionicons name="lock-closed-outline" size={15} color={INACTIVE} />
              <Text style={styles.helpText}>{t('settings_biometric_disclosure')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_data')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerCardRow} onPress={() => setShowClearConfirm(true)}>
            <Ionicons name="refresh-outline" size={20} color="#E65100" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dangerLabel, { color: '#E65100' }]}>{t('settings_clear_cache')}</Text>
              <Text style={styles.dangerSub}>{t('settings_clear_cache_sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#E65100" />
          </TouchableOpacity>
          <View style={styles.cardDivider} />
          <TouchableOpacity style={styles.dangerCardRow} onPress={() => setShowDeleteAllConfirm(true)}>
            <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerLabel}>{t('settings_delete_all')}</Text>
              <Text style={styles.dangerSub}>{t('settings_delete_all_sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_legal')}</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Ionicons name="shield-checkmark-outline" size={18} color={INACTIVE} />
          <Text style={styles.settingLabel}>{t('settings_privacy_policy')}</Text>
          <Ionicons name="chevron-forward" size={16} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('LegalNotice')}>
          <Ionicons name="document-text-outline" size={18} color={INACTIVE} />
          <Text style={styles.settingLabel}>{t('settings_legal_notice')}</Text>
          <Ionicons name="chevron-forward" size={16} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Datenschutz')}>
          <Ionicons name="language-outline" size={18} color={INACTIVE} />
          <Text style={styles.settingLabel}>{t('settings_datenschutz')}</Text>
          <Ionicons name="chevron-forward" size={16} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkRow, { marginBottom: 0 }]} onPress={() => navigation.navigate('Impressum')}>
          <Ionicons name="language-outline" size={18} color={INACTIVE} />
          <Text style={styles.settingLabel}>{t('settings_impressum')}</Text>
          <Ionicons name="chevron-forward" size={16} color={INACTIVE} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_about')}</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('settings_app_version')}</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.settingLabel}>{t('settings_api')}</Text>
          <Text style={styles.settingValue}>{t('settings_api_value')}</Text>
        </View>
      </View>

      {/* Language switch confirm dialog */}
      <Dialog visible={showLangConfirm} onDismiss={() => setShowLangConfirm(false)}>
        <Dialog.Title>{t('settings_lang_confirm_title')}</Dialog.Title>
        <Dialog.Content>
          <Text>{t('settings_lang_confirm_msg', { language: pendingLang === 'de' ? 'Deutsch' : 'English' })}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowLangConfirm(false)}>{t('common_cancel')}</Button>
          <Button onPress={handleLangConfirm} textColor={PRIMARY}>{t('settings_lang_confirm_restart')}</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Clear cache dialog */}
      <Dialog visible={showClearConfirm} onDismiss={() => setShowClearConfirm(false)}>
        <Dialog.Title>{t('settings_clear_dialog_title')}</Dialog.Title>
        <Dialog.Content>
          <Text>{t('settings_clear_dialog_msg')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowClearConfirm(false)}>{t('common_cancel')}</Button>
          <Button onPress={handleClearCache} textColor="#E65100">{t('settings_clear_confirm')}</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete all data dialog */}
      <Dialog visible={showDeleteAllConfirm} onDismiss={() => setShowDeleteAllConfirm(false)}>
        <Dialog.Title>{t('settings_delete_dialog_title')}</Dialog.Title>
        <Dialog.Content>
          <Text>{t('settings_delete_dialog_msg')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowDeleteAllConfirm(false)}>{t('common_cancel')}</Button>
          <Button onPress={handleDeleteAllData} textColor="#D32F2F">{t('settings_delete_confirm')}</Button>
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

  // Card container used for all setting groups
  card: {
    backgroundColor: BG,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 14 },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  helpText: { flex: 1, fontSize: 12, color: INACTIVE, lineHeight: 17 },

  settingRow: { backgroundColor: BG, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BORDER },
  settingLabel: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  settingDesc: { fontSize: 12, color: INACTIVE, marginTop: 3, lineHeight: 16, paddingRight: 8 },
  settingValue: { fontSize: 13, color: INACTIVE },

  dangerCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  dangerRow: { backgroundColor: BG, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dangerLabel: { fontSize: 15, fontWeight: '500', color: '#D32F2F' },
  dangerSub: { fontSize: 12, color: INACTIVE, marginTop: 2 },

  linkRow: { backgroundColor: BG, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, alignItems: 'center' },
  langBtnActive: { borderColor: PRIMARY, backgroundColor: PRIMARY + '15' },
  langBtnText: { fontSize: 15, fontWeight: '700', color: '#555' },
  langBtnSub: { fontSize: 11, color: INACTIVE, marginTop: 2 },
  langBtnTextActive: { color: PRIMARY },
  langNote: { fontSize: 12, color: INACTIVE, marginTop: 2 },
});
