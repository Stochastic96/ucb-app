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
  shadow: '#000',
};

export const darkTheme = {
  mode: 'dark',
  spacing: SPACING,
  radius: RADIUS,
  fonts: FONTS,
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
