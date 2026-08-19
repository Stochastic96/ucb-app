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
  icon: { marginBottom: c.spacing.md },
  title: { ...c.type.title, color: c.text, textAlign: 'center', marginBottom: c.spacing.sm },
  subtitle: { ...c.type.bodySm, color: c.textMuted, textAlign: 'center' },
  button: { marginTop: c.spacing.md, borderRadius: c.radius.md },
  buttonLabel: { ...c.type.label },
});
