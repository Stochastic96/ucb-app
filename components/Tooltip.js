import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

export default function Tooltip({ text, size = 20 }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} hitSlop={10} accessibilityLabel="Help" accessibilityRole="button">
        <Ionicons name="help-circle-outline" size={size} color={c.textMuted} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.box}>
                <Ionicons name="information-circle-outline" size={22} color={c.brandIcon} style={{ marginBottom: 10 }} />
                <Text style={styles.text}>{text}</Text>
                <TouchableOpacity style={styles.btn} onPress={() => setVisible(false)}>
                  <Text style={styles.btnText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const makeStyles = (c) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
  },
  box: {
    backgroundColor: c.surface,
    borderRadius: c.radius.lg,
    padding: 22,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
    ...c.shadows.overlay,
  },
  text: { ...c.type.bodySm, color: c.textSecondary, textAlign: 'center', marginBottom: 18 },
  btn: {
    backgroundColor: c.primary,
    borderRadius: c.radius.md,
    paddingHorizontal: 28,
    paddingVertical: 11,
  },
  btnText: { ...c.type.label, color: c.onPrimary },
});
