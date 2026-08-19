import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useStore from '../store/useStore';
import { useTranslation } from '../services/i18n';
import { useThemedStyles } from '../theme/ThemeProvider';

export default function OfflineBanner() {
  const t = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const isOffline = useStore((s) => s.isOffline);
  const offlineQueueSize = useStore((s) => s.offlineQueueSize);
  if (!isOffline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t('offline_banner')}</Text>
      {offlineQueueSize > 0 && (
        <Text style={styles.pending}>
          {t('offline_banner_pending', { count: offlineQueueSize })}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  banner: {
    backgroundColor: c.warning,
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: {
    ...c.type.caption,
    // onWarningSolid is per-mode contrast text on the saturated warning fill
    color: c.onWarningSolid,
  },
  pending: {
    ...c.type.micro,
    color: c.onWarningSolid,
    opacity: 0.8,
    marginTop: 1,
  },
});
