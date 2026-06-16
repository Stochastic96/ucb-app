import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../constants/storageKeys';
import useStore from '../store/useStore';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { useTranslation } from '../services/i18n';

export default function AnalyticsConsentModal({ onLearnMore }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_CONSENT).then((val) => {
      if (!val) setVisible(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChoice = async (enabled) => {
    const { updateSettings, settings } = useStore.getState();
    await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_CONSENT, 'true');
    const next = { ...settings, analyticsEnabled: enabled };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
    updateSettings({ analyticsEnabled: enabled });
    setVisible(false);
  };

  const handleLearnMore = () => {
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onLearnMore?.();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="bar-chart-outline" size={32} color={c.brandIcon} />
          </View>

          {/* Title & body */}
          <Text style={styles.title}>{t('analytics_consent_title')}</Text>
          <Text style={styles.body}>{t('analytics_consent_msg')}</Text>

          {/* Learn more link */}
          <TouchableOpacity style={styles.learnMoreBtn} onPress={handleLearnMore}>
            <Text style={styles.learnMoreText}>{t('analytics_consent_learn_more')}</Text>
            <Ionicons name="chevron-forward" size={14} color={c.brandIcon} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.enableBtn}
            onPress={() => handleChoice(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.enableBtnText}>{t('analytics_consent_enable')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.disableBtn}
            onPress={() => handleChoice(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.disableBtnText}>{t('analytics_consent_disable')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: c.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: c.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.brandIcon,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginBottom: 20,
  },
  enableBtn: {
    backgroundColor: c.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  enableBtnText: {
    color: c.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  disableBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: c.border,
  },
  disableBtnText: {
    color: c.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
});
