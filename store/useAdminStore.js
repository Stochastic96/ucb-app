import { create } from 'zustand';
import { Buffer } from 'buffer';
import { supabase } from '../services/supabase';
import { getStoredCredentials } from '../services/api';

const useAdminStore = create((set) => ({
  isAdmin: false,
  adminChecked: false,

  // Called after Stud.IP login. Verifies identity server-side via Edge Function
  // so the admin_users table is never queryable by the client directly.
  checkAdminStatus: async (studipUsername) => {
    if (!studipUsername) { set({ isAdmin: false, adminChecked: true }); return; }
    try {
      const { username, password } = await getStoredCredentials();
      const studip_token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
      const { data, error } = await supabase.functions.invoke('check-admin', {
        body: { studip_username: studipUsername, studip_token },
      });
      if (error) throw error;
      set({ isAdmin: data?.is_admin === true, adminChecked: true });
    } catch {
      // Any failure (network, Edge Function error, credentials missing) → no admin
      set({ isAdmin: false, adminChecked: true });
    }
  },

  clearAdminStatus: () => set({ isAdmin: false, adminChecked: false }),
}));

export default useAdminStore;
