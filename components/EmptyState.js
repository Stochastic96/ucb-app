import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      {icon && <Ionicons name={icon} size={48} color={c.textMuted} style={styles.icon} />}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button} labelStyle={styles.buttonLabel}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 80 },
  icon: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonLabel: { fontSize: 14 },
});
