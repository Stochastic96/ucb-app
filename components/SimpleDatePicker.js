import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, INACTIVE, BG } from '../constants/colors';

export function SimpleDatePicker({ value, onChange, minimumDate, label }) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value ?? new Date());

  const display = value
    ? value.toLocaleDateString('en-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tap to set date';

  const open = () => {
    setDraft(value ?? new Date());
    setVisible(true);
  };

  const confirm = () => {
    onChange(draft);
    setVisible(false);
  };

  const onAndroidChange = (event, selected) => {
    setVisible(false);
    if (event.type !== 'dismissed' && selected) onChange(selected);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={open}>
        <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{display}</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setVisible(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{label ?? 'Select Date'}</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              minimumDate={minimumDate}
              onChange={(_, selected) => selected && setDraft(selected)}
              style={styles.picker}
            />
          </View>
        </Modal>
      ) : (
        visible && (
          <DateTimePicker
            value={draft}
            mode="date"
            display="default"
            minimumDate={minimumDate}
            onChange={onAndroidChange}
          />
        )
      )}
    </>
  );
}

export function SimpleTimePicker({ value, onChange, label }) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value ?? new Date());

  const display = value
    ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    : 'Tap to set time';

  const open = () => {
    setDraft(value ?? new Date());
    setVisible(true);
  };

  const confirm = () => {
    onChange(draft);
    setVisible(false);
  };

  const onAndroidChange = (event, selected) => {
    setVisible(false);
    if (event.type !== 'dismissed' && selected) onChange(selected);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={open}>
        <Ionicons name="time-outline" size={18} color={PRIMARY} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{display}</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setVisible(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{label ?? 'Select Time'}</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              is24Hour
              onChange={(_, selected) => selected && setDraft(selected)}
              style={styles.picker}
            />
          </View>
        </Modal>
      ) : (
        visible && (
          <DateTimePicker
            value={draft}
            mode="time"
            display="default"
            is24Hour
            onChange={onAndroidChange}
          />
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  triggerText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  placeholder: { color: INACTIVE },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  cancel: { fontSize: 15, color: INACTIVE },
  done: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  picker: { marginHorizontal: 16 },
});
