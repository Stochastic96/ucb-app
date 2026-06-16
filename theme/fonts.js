import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from '@expo-google-fonts/lexend';

// Bundled fonts — the binaries ship inside the app at build time via these npm
// packages, so there is NO runtime call to Google's CDN. This is the GDPR-safe
// path (German courts have ruled runtime Google Fonts fetches transmit IP to
// Google without consent). Do not switch to a CDN/link-based font load.
//
// Space Grotesk → display/headings (geometric, modern-academic feel)
// Lexend        → body/reading text (designed for reading fluency; helps ESL readers)
export const FONT_FAMILY = {
  display: 'SpaceGrotesk_700Bold',       // screen titles, card titles
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Lexend_400Regular',             // descriptions, paragraphs
  bodyMedium: 'Lexend_500Medium',
  bodySemiBold: 'Lexend_600SemiBold',
  bodyBold: 'Lexend_700Bold',
};

// Loads every weight the app references. Returns true once all fonts are ready.
// App.js gates rendering on this so text never flashes the system fallback.
export function useAppFonts() {
  const [loaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });
  return loaded;
}
