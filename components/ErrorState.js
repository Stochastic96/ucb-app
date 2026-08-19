import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../services/i18n';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

// Non-text presentation (icon + tone) stays here; the title/sub copy is resolved
// from i18n by type so error screens are localized (EN/DE). `tone` maps to a
// theme color in the component so the icon adapts to light/dark mode.
const CONFIG = {
  NO_INTERNET: { icon: 'wifi-outline', tone: 'warning', titleKey: 'errorstate_no_internet_title', subKey: 'errorstate_no_internet_sub' },
  SERVER_DOWN: { icon: 'server-outline', tone: 'error', titleKey: 'errorstate_server_title', subKey: 'errorstate_server_sub' },
  AUTH_FAILED: { icon: 'lock-closed-outline', tone: 'error', titleKey: 'errorstate_auth_title', subKey: 'errorstate_auth_sub' },
  UNKNOWN: { icon: 'alert-circle-outline', tone: 'muted', titleKey: 'errorstate_unknown_title', subKey: 'errorstate_unknown_sub' },
};

export default function ErrorState({ type = 'UNKNOWN', onRetry }) {
  const t = useTranslation();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { icon, tone, titleKey, subKey } = CONFIG[type] ?? CONFIG.UNKNOWN;
  const iconColor = tone === 'error' ? c.error : tone === 'warning' ? c.warning : c.textMuted;
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={iconColor} />
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.sub}>{t(subKey)}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('errorstate_retry')}>
          <Text style={styles.buttonText}>{t('errorstate_retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: c.spacing.xl },
  title: { ...c.type.title, marginTop: c.spacing.md, color: c.text },
  sub: { ...c.type.bodySm, color: c.textMuted, textAlign: 'center', marginTop: 6 },
  button: { marginTop: c.spacing.lg, backgroundColor: c.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: c.radius.sm },
  buttonText: { ...c.type.bodyStrong, color: c.onPrimary },
});
