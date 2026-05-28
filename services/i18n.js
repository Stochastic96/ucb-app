import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../constants/translations/en';
import de from '../constants/translations/de';

const STRINGS = { en, de };
let _language = 'en';

export async function initLanguage() {
  try {
    const lang = await AsyncStorage.getItem('ucb_language');
    if (lang === 'de' || lang === 'en') _language = lang;
  } catch {}
}

export function getLanguage() {
  return _language;
}

export async function saveLanguage(lang) {
  _language = lang;
  try {
    await AsyncStorage.setItem('ucb_language', lang);
  } catch {}
}

export function t(key, params) {
  const strings = STRINGS[_language] ?? STRINGS.en;
  let str = strings[key] ?? STRINGS.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
    });
  }
  return str;
}

// Hook for use in functional components — returns the t() function.
// Language is module-level and fixed at startup (hard restart on change).
export function useTranslation() {
  return t;
}
