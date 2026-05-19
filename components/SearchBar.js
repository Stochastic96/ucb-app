import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { INACTIVE, BORDER, BG } from '../constants/colors';

export default function SearchBar({ value, onChangeText, placeholder = 'Search…', autoFocus = false, style }) {
  const inputRef = useRef(null);

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={17} color={INACTIVE} style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={INACTIVE}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        autoFocus={autoFocus}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => { onChangeText(''); inputRef.current?.focus(); }}
          hitSlop={10}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={17} color={INACTIVE} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 0,
  },
});
