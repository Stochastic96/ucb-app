import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import useStore from '../store/useStore';
import { lightTheme, darkTheme } from '../constants/colors';

// Master switch for dark mode. Every screen, the navigation chrome (tab bar +
// headers), and the global overlays (Sidebar, modals, biometric lock) consume the
// theme, so dark mode is enabled. This remains the single chokepoint — set to
// `false` to force the whole app back to light if a regression is found.
export const DARK_MODE_ENABLED = true;

// Theme preference is stored in settings.themePreference: 'light' | 'dark' | 'system'.
// Default is 'light' so the app is visually unchanged unless the user opts in.
export function resolveThemeMode(preference, systemScheme) {
  if (!DARK_MODE_ENABLED) return 'light';
  if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return preference === 'dark' ? 'dark' : 'light';
}

const ThemeContext = createContext(lightTheme);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const preference = useStore((s) => s.settings?.themePreference ?? 'light');
  const mode = resolveThemeMode(preference, systemScheme);
  const theme = mode === 'dark' ? darkTheme : lightTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// Returns the active palette object (see constants/colors.js lightTheme/darkTheme).
export function useTheme() {
  return useContext(ThemeContext);
}

// Returns 'light' | 'dark' for the resolved active mode.
export function useThemeMode() {
  return useContext(ThemeContext).mode;
}

// Builds a StyleSheet from a `makeStyles(theme)` factory, recomputing only when
// the active theme changes. Keep the factory module-level for a stable identity.
export function useThemedStyles(factory) {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
