import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

export default function SearchBar({ value, onChangeText, placeholder = 'Search…', autoFocus = false, style }) {
  const inputRef = useRef(null);
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={17} color={c.textMuted} style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
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
          <Ionicons name="close-circle" size={17} color={c.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 15,
    color: c.text,
    paddingVertical: 0,
  },
});
