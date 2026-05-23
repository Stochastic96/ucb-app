import { createClient } from '@supabase/supabase-js';

// All Supabase access is anonymous read-only — no auth sessions, nothing stored in AsyncStorage
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
