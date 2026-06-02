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
