import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG } from '../constants/colors';

export default function Tooltip({ text, size = 20 }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} hitSlop={10} accessibilityLabel="Help" accessibilityRole="button">
        <Ionicons name="help-circle-outline" size={size} color={INACTIVE} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.box}>
                <Ionicons name="information-circle-outline" size={22} color={PRIMARY} style={{ marginBottom: 10 }} />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
  },
  box: {
    backgroundColor: BG,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  text: { fontSize: 14, color: '#333', lineHeight: 22, textAlign: 'center', marginBottom: 18 },
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 11,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
