import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

export default function ErrorOverlay({ error, onDismiss, onRetry }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!error) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Ionicons name="alert-circle" size={48} color={c.error} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Initialization Error</Text>
        <Text style={styles.message}>{error}</Text>
        <View style={styles.buttons}>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: c.radius.md,
    padding: c.spacing.lg,
    marginHorizontal: 20,
    alignItems: 'center',
    ...c.shadows.overlay,
  },
  title: {
    ...c.type.title,
    color: c.text,
    marginBottom: 12,
  },
  message: {
    ...c.type.bodySm,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    backgroundColor: c.primary,
    paddingVertical: 12,
    borderRadius: c.radius.sm,
    alignItems: 'center',
  },
  retryText: {
    ...c.type.label,
    color: c.onPrimary,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: c.surfaceSunken,
    paddingVertical: 12,
    borderRadius: c.radius.sm,
    alignItems: 'center',
  },
  dismissText: {
    ...c.type.label,
    color: c.text,
  },
});
