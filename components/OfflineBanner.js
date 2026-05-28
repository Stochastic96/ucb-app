import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useStore from '../store/useStore';
import { useTranslation } from '../services/i18n';

export default function OfflineBanner() {
  const t = useTranslation();
  const isOffline = useStore((s) => s.isOffline);
  if (!isOffline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t('offline_banner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F57C00',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
