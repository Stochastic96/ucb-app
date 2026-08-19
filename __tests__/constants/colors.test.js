import {
  TYPE,
  SHADOWS,
  withAlpha,
  guideCategoryColor,
  GUIDE_CATEGORY_COLORS,
  CALENDAR_CATEGORY_COLORS,
  TOOL_ICON_COLORS,
  PLATFORM_ICON_COLORS,
  PLANNER_CATEGORY_COLORS,
  FONTS,
  lightTheme,
  darkTheme,
} from '../../constants/colors';

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX8 = /^#[0-9a-fA-F]{8}$/;

describe('TYPE presets', () => {
  const presetNames = Object.keys(TYPE);

  it('defines the full preset set', () => {
    expect(presetNames).toEqual(
      expect.arrayContaining([
        'display', 'titleLg', 'title', 'heading', 'bodyStrong',
        'body', 'bodySm', 'label', 'caption', 'micro',
      ])
    );
  });

  it.each(presetNames)('%s has fontFamily/fontSize/lineHeight and NO fontWeight', (name) => {
    const preset = TYPE[name];
    // fontWeight combined with a custom fontFamily silently reverts to the
    // system font on Android — presets must never carry it.
    expect(preset.fontWeight).toBeUndefined();
    expect(Object.values(FONTS)).toContain(preset.fontFamily);
    expect(preset.fontSize).toBeGreaterThanOrEqual(11); // app-wide minimum size
    expect(preset.lineHeight).toBeGreaterThanOrEqual(preset.fontSize);
  });
});

describe('SHADOWS', () => {
  it('light and dark expose the same levels', () => {
    expect(Object.keys(SHADOWS.light).sort()).toEqual(Object.keys(SHADOWS.dark).sort());
  });

  it.each(['light', 'dark'])('%s levels carry both iOS and Android fields', (mode) => {
    Object.values(SHADOWS[mode]).forEach((level) => {
      expect(level.shadowColor).toBeDefined();
      expect(level.shadowOpacity).toBeGreaterThan(0);
      expect(level.elevation).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('withAlpha', () => {
  it('appends alpha to 6-digit hex', () => {
    expect(withAlpha('#E65100', '26')).toBe('#E6510026');
  });

  it('passes non-6-digit-hex values through unchanged', () => {
    expect(withAlpha('#FFF', '26')).toBe('#FFF');
    expect(withAlpha('rgba(0,0,0,0.5)', '26')).toBe('rgba(0,0,0,0.5)');
    expect(withAlpha('red', '26')).toBe('red');
  });
});

describe('feature color maps', () => {
  it('GUIDE_CATEGORY_COLORS entries all have light and dark 6-digit hex', () => {
    Object.entries(GUIDE_CATEGORY_COLORS).forEach(([, entry]) => {
      expect(entry.light).toMatch(HEX6);
      expect(entry.dark).toMatch(HEX6);
    });
  });

  it('guideCategoryColor falls back to brand green for unknown keys', () => {
    expect(guideCategoryColor('nope', 'light')).toBe(lightTheme.primary);
    expect(guideCategoryColor('nope', 'dark')).toBe(darkTheme.primary);
    expect(guideCategoryColor('emergency', 'dark')).toBe(GUIDE_CATEGORY_COLORS.emergency.dark);
  });

  it('CALENDAR_CATEGORY_COLORS entries have per-mode color and bg', () => {
    Object.values(CALENDAR_CATEGORY_COLORS).forEach((entry) => {
      expect(entry.color.light).toMatch(HEX6);
      expect(entry.color.dark).toMatch(HEX6);
      expect(entry.bg.light).toMatch(HEX6);
      expect(entry.bg.dark).toMatch(HEX8); // derived via withAlpha
    });
  });

  it.each([
    ['TOOL_ICON_COLORS', TOOL_ICON_COLORS],
    ['PLATFORM_ICON_COLORS', PLATFORM_ICON_COLORS],
  ])('%s entries have light/dark icon+bg', (_, map) => {
    Object.values(map).forEach((entry) => {
      expect(entry.light.icon).toMatch(HEX6);
      expect(entry.light.bg).toMatch(HEX6);
      expect(entry.dark.icon).toMatch(HEX8);
      expect(entry.dark.bg).toMatch(HEX8);
    });
  });

  it('PLANNER_CATEGORY_COLORS entries have light and dark', () => {
    Object.values(PLANNER_CATEGORY_COLORS).forEach((entry) => {
      expect(entry.light).toMatch(HEX6);
      expect(entry.dark).toMatch(HEX6);
    });
  });
});

describe('palette integration', () => {
  it('both palettes expose type and shadows tokens', () => {
    expect(lightTheme.type).toBe(TYPE);
    expect(darkTheme.type).toBe(TYPE);
    expect(lightTheme.shadows).toBe(SHADOWS.light);
    expect(darkTheme.shadows).toBe(SHADOWS.dark);
  });
});
