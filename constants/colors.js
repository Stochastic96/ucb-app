export const PRIMARY = '#6FAE3E';
export const DARK = '#3D6B22';
export const INACTIVE = '#666';
export const BG = '#fff';
export const ERROR = '#D32F2F';
export const WARNING = '#F57C00';
export const SURFACE = '#F5F5F5';
export const BORDER = '#E0E0E0';
export const TEXT = '#1A1A1A';
export const TEXT_SECONDARY = '#555555';
export const ACCENT = '#EDF6E5';

// Campus-event category colors — used by HomeScreen and EventsScreen.
// Keyed by the `category` field returned from Supabase `campus_events`.
export const CATEGORY_COLORS = {
  party: '#E91E63',
  gaming: '#7B1FA2',
  social: '#1976D2',
  academic: '#455A64',
  sports: '#388E3C',
  outdoor: '#F57C00',
  cultural: '#D84315',
  culture: '#00796B',
  recurring: '#6FAE3E', // PRIMARY — cannot reference PRIMARY here (defined below)
};

// Fact-of-the-day category palette — chosen for student color psychology:
// greens/blues lower stress and aid focus; warm amber sparks curiosity (the "hook").
// Each color drives the card gradient, the category chip, and the source link.
export const FACT_CATEGORY_COLORS = {
  energy:   '#F5A623', // amber — optimism, energising curiosity
  nature:   '#388E3C', // forest green — restorative, calm focus
  water:    '#2D9CDB', // teal blue — trust, clarity, serenity
  waste:    '#7E57C2', // violet — creativity, transformation
  mobility: '#0277BD', // blue — movement, dependability
  policy:   '#455A64', // slate indigo — stability, seriousness
};

// ── Layout scales (mode-independent) ───────────────────────────────────
// Single source of truth for spacing and corner radii. Spread into both
// palettes below so screens read them off the active theme: theme.spacing.md,
// theme.radius.lg. Replaces the ad-hoc 10/12/14/16 values scattered across
// screens — migrate values to these tokens as screens are touched.
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

// Font-family tokens (mode-independent). Values match the bundled font module
// names from theme/fonts.js; spread into both palettes so screens read
// theme.fonts.display / theme.fonts.body. Safe to reference only because the
// fonts are loaded (and render gated) at app start.
export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Lexend_400Regular',
  bodyMedium: 'Lexend_500Medium',
  bodySemiBold: 'Lexend_600SemiBold',
  bodyBold: 'Lexend_700Bold',
};

// ── Typography presets (mode-independent) ──────────────────────────────
// The ONLY sanctioned way to style text. Each preset carries fontFamily +
// fontSize + lineHeight and deliberately NO fontWeight: with custom fonts the
// weight is baked into the family name, and Android silently falls back to the
// system font when fontWeight is combined with a custom fontFamily. Spread into
// styles as `...c.type.title`. Escape hatch for one-off display numerals:
// `fontFamily: c.fonts.display` + explicit fontSize. Emoji-only text keeps a
// raw fontSize and no fontFamily.
export const TYPE = {
  display:    { fontFamily: FONTS.display,      fontSize: 28, lineHeight: 34 }, // hero titles
  titleLg:    { fontFamily: FONTS.display,      fontSize: 22, lineHeight: 28 }, // screen titles
  title:      { fontFamily: FONTS.display,      fontSize: 18, lineHeight: 24 }, // card titles
  heading:    { fontFamily: FONTS.displaySemiBold, fontSize: 16, lineHeight: 22 }, // sub-headers
  bodyStrong: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 21 }, // emphasised row titles
  body:       { fontFamily: FONTS.body,         fontSize: 15, lineHeight: 22 }, // paragraphs
  bodySm:     { fontFamily: FONTS.body,         fontSize: 13, lineHeight: 19 }, // secondary text
  label:      { fontFamily: FONTS.bodySemiBold, fontSize: 13, lineHeight: 18 }, // buttons, chips
  caption:    { fontFamily: FONTS.bodyMedium,   fontSize: 12, lineHeight: 16 }, // metadata
  micro:      { fontFamily: FONTS.bodySemiBold, fontSize: 11, lineHeight: 14 }, // badges, tags — smallest allowed size
};

// ── Elevation scale (per-mode) ─────────────────────────────────────────
// Three shadow levels replace the ad-hoc per-screen recipes. Dark mode needs
// stronger opacity to read against #121212. Spread as `...c.shadows.card`.
export const SHADOWS = {
  light: {
    card:    { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,  elevation: 1 },
    raised:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4 },
    overlay: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 16 },
  },
  dark: {
    card:    { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.30, shadowRadius: 8,  elevation: 1 },
    raised:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.40, shadowRadius: 12, elevation: 4 },
    overlay: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 16 },
  },
};

// Appends a 2-digit hex alpha to a 6-digit hex color (e.g. withAlpha('#E65100',
// '26') → '#E6510026', ~15% opacity). Guarded: the trick is only valid on
// 6-digit hex — anything else (3-digit, rgba(), named colors) passes through
// unchanged rather than producing an invalid color string.
export function withAlpha(hex, alphaHex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + alphaHex : hex;
}

// Dark-mode brand green (matches darkTheme.primary below — keep in sync).
const PRIMARY_ON_DARK = '#7FBF4D';

// Icon tile colors: light mode uses the hand-picked pastel bg; dark mode
// derives a tinted bg (15% alpha) and a slightly translucent icon from the
// same base color, replacing the per-screen `c.mode === 'dark' ?` ternaries.
function makeIconColors(color, lightBg) {
  return {
    light: { icon: color, bg: lightBg },
    dark:  { icon: withAlpha(color, 'DF'), bg: withAlpha(color, '26') },
  };
}

// ── Feature color maps (single source of truth; screens must not define
// their own hex colors) ────────────────────────────────────────────────

// Guide category accents — light values are the original Material 800-range
// tones; dark values are the lighter Material 300-range equivalents so chips
// and icons stay readable on dark surfaces.
export const GUIDE_CATEGORY_COLORS = {
  emergency:     { light: '#D32F2F', dark: '#EF5350' },
  buildings:     { light: '#1565C0', dark: '#64B5F6' },
  checklist:     { light: '#2E7D32', dark: '#81C784' },
  offices:       { light: '#6A1B9A', dark: '#BA68C8' },
  contacts:      { light: '#00695C', dark: '#4DB6AC' },
  glossary:      { light: '#E65100', dark: '#FFB74D' },
  phrases:       { light: '#AD1457', dark: '#F06292' },
  faq:           { light: '#4527A0', dark: '#B39DDB' },
  work:          { light: '#1976D2', dark: '#90CAF9' },
  health:        { light: '#00838F', dark: '#4DD0E1' },
  accommodation: { light: '#5D4037', dark: '#BCAAA4' },
  bureaucracy:   { light: '#37474F', dark: '#90A4AE' },
  language:      { light: '#7B1FA2', dark: '#CE93D8' },
  rights:        { light: '#EF6C00', dark: '#FFA726' },
};

// Falls back to the brand green when a category has no entry.
export function guideCategoryColor(key, mode) {
  return GUIDE_CATEGORY_COLORS[key]?.[mode] ?? (mode === 'dark' ? PRIMARY_ON_DARK : PRIMARY);
}

// Semester-calendar event categories (colors only — labelKeys stay with the
// screen since they go through t()).
export const CALENDAR_CATEGORY_COLORS = {
  academic: { color: { light: '#1976D2', dark: '#64B5F6' }, bg: { light: '#E3F2FD', dark: withAlpha('#1976D2', '26') } },
  exams:    { color: { light: '#E65100', dark: '#FFB74D' }, bg: { light: '#FBE9E7', dark: withAlpha('#E65100', '26') } },
  admin:    { color: { light: '#6A1B9A', dark: '#CE93D8' }, bg: { light: '#F3E5F5', dark: withAlpha('#6A1B9A', '26') } },
  holiday:  { color: { light: '#2E7D32', dark: '#81C784' }, bg: { light: '#E8F5E9', dark: withAlpha('#2E7D32', '26') } },
};

// Tools-grid icon tiles, keyed by tool id (screens/tools/ToolsScreen.js).
export const TOOL_ICON_COLORS = {
  timetable:         makeIconColors('#2196F3', '#E3F2FD'),
  mensa:             makeIconColors('#4CAF50', '#E8F5E9'),
  calendar:          makeIconColors('#6FAE3E', '#EDF6E5'),
  exams:             makeIconColors('#E65100', '#FBE9E7'),
  events:            makeIconColors('#E91E63', '#FCE4EC'),
  courses:           makeIconColors('#3F51B5', '#E8EAF6'),
  news:              makeIconColors('#FF9800', '#FFF3E0'),
  planner:           makeIconColors('#9C27B0', '#F3E5F5'),
  waste:             makeIconColors('#0D9488', '#CCFBF1'),
  resources:         makeIconColors('#00796B', '#E0F2F1'),
  platforms:         makeIconColors('#0369A1', '#E0F2FE'),
  'library-booking': makeIconColors('#5C6BC0', '#E8EAF6'),
  campus:            makeIconColors('#7B1FA2', '#F3E5F5'),
};

// Campus-platform icon tiles, keyed by platform id (CampusPlatformsScreen.js).
export const PLATFORM_ICON_COLORS = {
  mattermost: makeIconColors('#0058CC', '#E8F0FB'),
  bbb:        makeIconColors('#C0392B', '#FDECEA'),
  teams:      makeIconColors('#6264A7', '#EDECF8'),
};

// Neutral fallback so an id missing from the maps above never crashes a render.
const DEFAULT_ICON_COLORS = makeIconColors('#607D8B', '#ECEFF1');

// Accessors that resolve the {icon, bg} pair for a given id + mode, falling back
// to a neutral tile when the id has no entry (guards against new tools/platforms
// added without a matching color entry).
export function toolIconColor(id, mode) {
  return (TOOL_ICON_COLORS[id] ?? DEFAULT_ICON_COLORS)[mode];
}
export function platformIconColor(id, mode) {
  return (PLATFORM_ICON_COLORS[id] ?? DEFAULT_ICON_COLORS)[mode];
}

// Deadline categories (PlannerScreen). Academic tracks the brand green per mode.
export const PLANNER_CATEGORY_COLORS = {
  academic:     { light: PRIMARY,   dark: PRIMARY_ON_DARK },
  bureaucratic: { light: '#E65100', dark: '#FFB74D' },
  personal:     { light: '#7B1FA2', dark: '#CE93D8' },
};

// ── Semantic theme palettes (light / dark) ─────────────────────────────
// The LIGHT palette maps every token to the app's existing hard values, so
// light mode is visually identical to before theming was introduced. Screens
// consume these via useTheme(); the static exports above remain for backward
// compatibility (any not-yet-converted screen keeps working, just stays light).
export const lightTheme = {
  mode: 'light',
  spacing: SPACING,
  radius: RADIUS,
  fonts: FONTS,
  type: TYPE,
  shadows: SHADOWS.light,
  primary: PRIMARY,        // brand green
  primaryDark: DARK,       // gradient start / dark brand green
  brandIcon: DARK,         // dark-green icons/accents on light surfaces
  onPrimary: '#fff',       // text/icon on a primary-colored fill
  bg: SURFACE,             // screen background (#F5F5F5)
  surface: BG,             // cards / elevated surfaces (#fff)
  surfaceAlt: '#FAFAFA',   // inputs / subtle fills
  surfaceSunken: '#F0F0F0',// dividers / sunken chips
  text: TEXT,              // primary text (#1A1A1A)
  textSecondary: TEXT_SECONDARY, // #555555
  textMuted: INACTIVE,     // #666 — captions, inactive
  textFaint: '#767676',    // disclaimers, faint meta (4.5:1 on white — WCAG AA)
  border: BORDER,          // #E0E0E0
  accent: ACCENT,          // #EDF6E5 light green tint
  error: ERROR,
  warning: WARNING,
  warningSurface: '#FFF8E1', // amber banner background
  warningBorder: '#FFD54F',  // amber banner border
  onWarning: '#7A5800',      // text/icon on a warning surface
  onWarningSolid: '#FFFFFF', // text/icon on the saturated `warning` fill (offline banner)
  info: '#1976D2',           // informational accents (banners, links)
  infoSurface: '#E3F2FD',    // informational banner background
  shadow: '#000',
};

export const darkTheme = {
  mode: 'dark',
  spacing: SPACING,
  radius: RADIUS,
  fonts: FONTS,
  type: TYPE,
  shadows: SHADOWS.dark,
  primary: '#7FBF4D',      // slightly lifted green for contrast on dark
  primaryDark: DARK,       // gradient keeps the brand identity
  brandIcon: '#7FBF4D',    // brand icons must stay readable on dark surfaces
  onPrimary: '#fff',
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#242424',
  surfaceSunken: '#2A2A2A',
  text: '#ECECEC',
  textSecondary: '#C2C2C2',
  textMuted: '#9A9A9A',
  textFaint: '#8A8A8A',    // ~4.8:1 on dark surface — WCAG AA
  border: '#333333',
  accent: '#1E2A16',       // dark green tint
  error: '#EF5350',
  warning: '#FFA726',
  warningSurface: '#2A2310', // dark amber banner background
  warningBorder: '#5C4A1A',  // dark amber banner border
  onWarning: '#FFCA66',      // text/icon on a dark warning surface
  onWarningSolid: '#1A1A1A', // dark text on the light-amber `warning` fill (offline banner)
  info: '#90CAF9',           // informational accents on dark surfaces
  infoSurface: 'rgba(33,150,243,0.15)', // informational banner background (dark)
  shadow: '#000',
};

// 12 distinct colors for course color-coding (assigned by index % 12)
export const COURSE_COLORS = [
  '#6FAE3E',
  '#2196F3',
  '#E91E63',
  '#FF9800',
  '#9C27B0',
  '#00BCD4',
  '#F44336',
  '#4CAF50',
  '#FF5722',
  '#3F51B5',
  '#009688',
  '#795548',
];
