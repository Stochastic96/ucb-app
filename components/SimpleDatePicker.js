import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, DARK, INACTIVE, BG, SURFACE, BORDER } from '../constants/colors';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad(n) { return String(n).padStart(2, '0'); }

export function SimpleDatePicker({ value, onChange, minimumDate, label }) {
  const [visible, setVisible] = useState(false);
  const d = value ?? new Date();
  const [year, setYear] = useState(d.getFullYear());
  const [month, setMonth] = useState(d.getMonth());
  const [day, setDay] = useState(d.getDate());

  const minYear = minimumDate ? minimumDate.getFullYear() : 2026;
  const maxYear = minYear + 3;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);

  const confirm = () => {
    const result = new Date(year, month, safeDay, d.getHours(), d.getMinutes(), 0, 0);
    onChange(result);
    setVisible(false);
  };

  const displayStr = value
    ? value.toLocaleDateString('en-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tap to set date';

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => { setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate()); setVisible(true); }}>
        <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{displayStr}</Text>
      </TouchableOpacity>

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

          <View style={styles.columns}>
            {/* Month */}
            <SpinColumn
              label="Month"
              value={MONTHS[month]}
              onPrev={() => setMonth((m) => (m - 1 + 12) % 12)}
              onNext={() => setMonth((m) => (m + 1) % 12)}
            />
            {/* Day */}
            <SpinColumn
              label="Day"
              value={pad(safeDay)}
              onPrev={() => setDay((v) => v <= 1 ? daysInMonth : v - 1)}
              onNext={() => setDay((v) => v >= daysInMonth ? 1 : v + 1)}
            />
            {/* Year */}
            <SpinColumn
              label="Year"
              value={String(year)}
              onPrev={() => setYear((v) => Math.max(v - 1, minYear))}
              onNext={() => setYear((v) => Math.min(v + 1, maxYear))}
              disablePrev={year <= minYear}
              disableNext={year >= maxYear}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function SimpleTimePicker({ value, onChange, label }) {
  const [visible, setVisible] = useState(false);
  const d = value ?? new Date();
  const [hour, setHour] = useState(d.getHours());
  const [minute, setMinute] = useState(Math.floor(d.getMinutes() / 5) * 5);

  const confirm = () => {
    const result = new Date(d);
    result.setHours(hour, minute, 0, 0);
    onChange(result);
    setVisible(false);
  };

  const displayStr = value
    ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
    : 'Tap to set time';

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => { setHour(d.getHours()); setMinute(Math.floor(d.getMinutes() / 5) * 5); setVisible(true); }}>
        <Ionicons name="time-outline" size={18} color={PRIMARY} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{displayStr}</Text>
      </TouchableOpacity>

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

          <View style={styles.columns}>
            <SpinColumn
              label="Hour"
              value={pad(hour)}
              onPrev={() => setHour((v) => (v - 1 + 24) % 24)}
              onNext={() => setHour((v) => (v + 1) % 24)}
            />
            <View style={styles.colonWrap}>
              <Text style={styles.colon}>:</Text>
            </View>
            <SpinColumn
              label="Minute"
              value={pad(minute)}
              onPrev={() => setMinute((v) => (v - 5 + 60) % 60)}
              onNext={() => setMinute((v) => (v + 5) % 60)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function SpinColumn({ label, value, onPrev, onNext, disablePrev, disableNext }) {
  return (
    <View style={styles.col}>
      <TouchableOpacity onPress={onNext} disabled={disableNext} style={styles.arrow}>
        <Ionicons name="chevron-up" size={22} color={disableNext ? BORDER : DARK} />
      </TouchableOpacity>
      <View style={styles.colValue}>
        <Text style={styles.colValueText}>{value}</Text>
        <Text style={styles.colLabel}>{label}</Text>
      </View>
      <TouchableOpacity onPress={onPrev} disabled={disablePrev} style={styles.arrow}>
        <Ionicons name="chevron-down" size={22} color={disablePrev ? BORDER : DARK} />
      </TouchableOpacity>
    </View>
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
  columns: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  col: { alignItems: 'center', minWidth: 72 },
  arrow: { padding: 8 },
  colValue: { alignItems: 'center', paddingVertical: 6 },
  colValueText: { fontSize: 32, fontWeight: '700', color: '#1A1A1A' },
  colLabel: { fontSize: 11, color: INACTIVE, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  colonWrap: { paddingBottom: 20 },
  colon: { fontSize: 32, fontWeight: '700', color: INACTIVE },
});
