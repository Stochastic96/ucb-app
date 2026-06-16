import { resolveThemeMode, DARK_MODE_ENABLED } from '../../theme/ThemeProvider';
import { lightTheme, darkTheme } from '../../constants/colors';

describe('resolveThemeMode', () => {
  // Dark mode is gated behind DARK_MODE_ENABLED until every screen is themed.
  // While the flag is false, resolveThemeMode must force light for ALL inputs so
  // a stale 'dark'/'system' preference can never produce a half-themed app.
  if (!DARK_MODE_ENABLED) {
    it('forces light for every preference while dark mode is gated off', () => {
      expect(resolveThemeMode('light', 'dark')).toBe('light');
      expect(resolveThemeMode('dark', 'light')).toBe('light');
      expect(resolveThemeMode('system', 'dark')).toBe('light');
      expect(resolveThemeMode('system', null)).toBe('light');
      expect(resolveThemeMode(undefined, 'dark')).toBe('light');
    });
  } else {
    it('maps explicit light/dark preferences directly', () => {
      expect(resolveThemeMode('light', 'dark')).toBe('light');
      expect(resolveThemeMode('dark', 'light')).toBe('dark');
    });

    it('resolves "system" against the OS color scheme', () => {
      expect(resolveThemeMode('system', 'dark')).toBe('dark');
      expect(resolveThemeMode('system', 'light')).toBe('light');
    });

    it('falls back to light when the system scheme is null/unknown', () => {
      expect(resolveThemeMode('system', null)).toBe('light');
      expect(resolveThemeMode('system', undefined)).toBe('light');
    });

    it('defaults unknown preferences to light (opt-in dark)', () => {
      expect(resolveThemeMode(undefined, 'dark')).toBe('light');
      expect(resolveThemeMode('', 'dark')).toBe('light');
    });
  }
});

describe('theme palettes', () => {
  it('expose a consistent set of tokens across light and dark', () => {
    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.mode).toBe('dark');
    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
  });
});
