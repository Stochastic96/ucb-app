import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Dialog, Button, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { clearAllCache } from '../../services/cache';
import { logout } from '../../services/auth';
import useStore from '../../store/useStore';
import { useNavigation } from '@react-navigation/native';
import { getLanguage, saveLanguage, useTranslation } from '../../services/i18n';
import { SECURE_KEYS } from '../../constants/secureKeys';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { resetIdentity } from '../../services/campusIdentity';
import { clearLogs } from '../../services/logger';
import { useTheme, useThemedStyles, DARK_MODE_ENABLED } from '../../theme/ThemeProvider';
import { requestNotificationPermission } from '../../services/reminders';

// Every key "Delete all data" must erase (Art. 17 DSGVO), derived from the
// STORAGE_KEYS single source of truth so a newly added key can't be forgotten here.
// Invariant (asserted in __tests__/screens/LegalScreens.test.js): everything
// clearAllCache() deliberately preserves must appear in this list.
export const USER_DATA_KEYS = Object.values(STORAGE_KEYS);

export default function SettingsScreen() {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
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

  const handleToggleNotifications = async (val) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          t('notifications_permission_denied_title') || 'Permission Denied',
          t('notifications_permission_denied_msg') || 'Please enable notifications in your device settings to receive reminders.'
        );
        persistSettings({ notificationsEnabled: false });
        return;
      }
    }
    persistSettings({ notificationsEnabled: val });
  };

  const currentTheme = settings.themePreference ?? 'light';
  const handleSetTheme = (pref) => {
    if (pref === currentTheme) return;
    persistSettings({ themePreference: pref });
  };

  const handleToggleBiometric = async (val) => {
    if (val) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('biometric_prompt_message') || 'Authenticate to enable biometric lock',
        });
        if (!result.success) return;
      } catch {
        return;
      }
    }
    try {
      await SecureStore.setItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED, String(val));
    } catch {}
    persistSettings({ biometricLockEnabled: val });
  };

  const handleLanguagePress = (lang) => {
    if (lang === currentLang) return;
    setPendingLang(lang);
    setShowLangConfirm(true);
  };

  const handleLangConfirm = async () => {
    setShowLangConfirm(false);
    await saveLanguage(pendingLang);
    // Soft remount: updating the store language re-keys the app tree in App.js
    // so every screen re-reads translations immediately — no app restart.
    useStore.getState().setLanguage(pendingLang);
  };

  const handleClearCache = async () => {
    setShowClearConfirm(false);
    try {
      await clearAllCache();
      setSnackbarMsg(t('settings_cache_cleared'));
      setSnackbarVisible(true);
    } catch {
      setSnackbarMsg(t('settings_cache_failed'));
      setSnackbarVisible(true);
    }
  };

  const handleDeleteAllData = async () => {
    setShowDeleteAllConfirm(false);
    try {
      await AsyncStorage.multiRemove(USER_DATA_KEYS);
      // Drops the logger's in-memory buffer too — without this the next log write
      // would re-persist ucb_logs straight after the multiRemove above.
      clearLogs();
      await resetIdentity();
      await logout();
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

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_appearance')}</Text>
        <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
          <Text style={styles.settingLabel}>{t('settings_theme_label')}</Text>
          <View style={styles.langRow}>
            {['light', 'dark', 'system'].map((pref) => {
              // Dark mode is not production-ready yet (see DARK_MODE_ENABLED in
              // ThemeProvider). Show dark/system as disabled "Soon" until then.
              const enabled = DARK_MODE_ENABLED || pref === 'light';
              const selected = enabled && (DARK_MODE_ENABLED ? currentTheme === pref : pref === 'light');
              return (
                <TouchableOpacity
                  key={pref}
                  style={[styles.langBtn, selected && styles.langBtnActive, !enabled && styles.langBtnDisabled]}
                  onPress={() => enabled && handleSetTheme(pref)}
                  disabled={!enabled}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !enabled }}
                  accessibilityLabel={t(`theme_${pref}`)}
                >
                  <Text style={[styles.langBtnText, selected && styles.langBtnTextActive]}>{t(`theme_${pref}`)}</Text>
                  {!enabled && <Text style={styles.langBtnSub}>{t('theme_soon')}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.langNote}>{t('settings_theme_note')}</Text>
        </View>
      </View>

      {/* Notifications & Reminders Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_notifications')}</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.settingLabel}>{t('settings_notifications_title')}</Text>
              <Text style={styles.settingDesc}>{t('settings_notifications_desc')}</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled ?? false}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: c.primary }}
              accessibilityLabel={t('settings_notifications_title')}
              accessibilityRole="switch"
            />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.helpBanner}>
            <Ionicons name="information-circle-outline" size={15} color={c.textMuted} />
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
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.settingLabel}>{t('settings_biometric_title')}</Text>
                <Text style={styles.settingDesc}>{t('settings_biometric_desc')}</Text>
              </View>
              <Switch
                value={settings.biometricLockEnabled ?? false}
                onValueChange={handleToggleBiometric}
                trackColor={{ true: c.primary }}
                accessibilityLabel={t('settings_biometric_title')}
                accessibilityRole="switch"
              />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.helpBanner}>
              <Ionicons name="lock-closed-outline" size={15} color={c.textMuted} />
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
            <Ionicons name="refresh-outline" size={20} color={c.onWarning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dangerLabel, { color: c.onWarning }]}>{t('settings_clear_cache')}</Text>
              <Text style={styles.dangerSub}>{t('settings_clear_cache_sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.onWarning} />
          </TouchableOpacity>
          <View style={styles.cardDivider} />
          <TouchableOpacity style={styles.dangerCardRow} onPress={() => setShowDeleteAllConfirm(true)}>
            <Ionicons name="trash-outline" size={20} color={c.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerLabel}>{t('settings_delete_all')}</Text>
              <Text style={styles.dangerSub}>{t('settings_delete_all_sub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings_section_legal')}</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Ionicons name="shield-checkmark-outline" size={18} color={c.textMuted} />
          <Text style={styles.settingLabel}>{t('settings_privacy_policy')}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('LegalNotice')}>
          <Ionicons name="document-text-outline" size={18} color={c.textMuted} />
          <Text style={styles.settingLabel}>{t('settings_legal_notice')}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Datenschutz')}>
          <Ionicons name="shield-outline" size={18} color={c.textMuted} />
          <Text style={styles.settingLabel}>{t('settings_datenschutz')}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkRow, { marginBottom: 0 }]} onPress={() => navigation.navigate('Impressum')}>
          <Ionicons name="information-circle-outline" size={18} color={c.textMuted} />
          <Text style={styles.settingLabel}>{t('settings_impressum')}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} style={{ marginLeft: 'auto' }} />
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
          <Text style={{ color: c.text }}>{t('settings_lang_confirm_msg', { language: pendingLang === 'de' ? 'Deutsch' : 'English' })}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowLangConfirm(false)}>{t('common_cancel')}</Button>
          <Button onPress={handleLangConfirm} textColor={c.primary}>{t('settings_lang_confirm_restart')}</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Clear cache dialog */}
      <Dialog visible={showClearConfirm} onDismiss={() => setShowClearConfirm(false)}>
        <Dialog.Title>{t('settings_clear_dialog_title')}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: c.text }}>{t('settings_clear_dialog_msg')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowClearConfirm(false)}>{t('common_cancel')}</Button>
          <Button onPress={handleClearCache} textColor={c.onWarning}>{t('settings_clear_confirm')}</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete all data dialog */}
      <Dialog visible={showDeleteAllConfirm} onDismiss={() => setShowDeleteAllConfirm(false)}>
        <Dialog.Title>{t('settings_delete_dialog_title')}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: c.text }}>{t('settings_delete_dialog_msg')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowDeleteAllConfirm(false)}>{t('common_cancel')}</Button>
          <Button onPress={handleDeleteAllData} textColor={c.error}>{t('settings_delete_confirm')}</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000}>
        {snackbarMsg}
      </Snackbar>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { ...c.type.caption, fontFamily: c.fonts.bodySemiBold, color: c.textMuted, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },

  // Card container used for all setting groups
  card: {
    backgroundColor: c.surface,
    borderRadius: c.radius.md,
    overflow: 'hidden',
    ...c.shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardDivider: { height: 1, backgroundColor: c.border, marginHorizontal: 14 },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  helpText: { ...c.type.caption, flex: 1, color: c.textMuted },

  settingRow: { backgroundColor: c.surface, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
  settingLabel: { ...c.type.body, fontFamily: c.fonts.bodyMedium, color: c.text },
  settingDesc: { ...c.type.caption, color: c.textMuted, marginTop: 3, paddingRight: 8 },
  settingValue: { ...c.type.bodySm, color: c.textMuted },

  dangerCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  dangerLabel: { ...c.type.body, fontFamily: c.fonts.bodyMedium, color: c.error },
  dangerSub: { ...c.type.caption, color: c.textMuted, marginTop: 2 },

  linkRow: { backgroundColor: c.surface, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center' },
  langBtnActive: { borderColor: c.primary, backgroundColor: c.primary + '15' },
  langBtnDisabled: { opacity: 0.45 },
  langBtnText: { ...c.type.bodyStrong, fontFamily: c.fonts.bodyBold, color: c.textSecondary },
  langBtnSub: { ...c.type.micro, fontFamily: c.fonts.body, color: c.textMuted, marginTop: 2 },
  langBtnTextActive: { color: c.primary },
  langNote: { ...c.type.caption, color: c.textMuted, marginTop: 2 },
});
