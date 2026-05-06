import { create } from 'zustand';
import { supabase } from '../services/supabase';

const useAdminStore = create((set) => ({
  isAdmin: false,
  adminChecked: false,

  // Called after StudIP login with the user's username (e.g. 'prsh4078')
  checkAdminStatus: async (studipUsername) => {
    if (!studipUsername) { set({ isAdmin: false, adminChecked: true }); return; }
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('studip_username')
        .eq('studip_username', studipUsername)
        .maybeSingle();
      set({ isAdmin: !!data, adminChecked: true });
    } catch {
      // If Supabase unreachable, default to no admin access
      set({ isAdmin: false, adminChecked: true });
    }
  },

  clearAdminStatus: () => set({ isAdmin: false, adminChecked: false }),
}));

export default useAdminStore;
