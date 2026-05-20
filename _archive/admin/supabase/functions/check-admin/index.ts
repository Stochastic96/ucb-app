// Supabase Edge Function: check-admin
//
// Verifies a Stud.IP user's identity and checks if they are an admin.
// The admin_users table has RLS set to deny ALL anon reads — this function
// is the only way to check admin status, and it validates Stud.IP credentials
// before touching the table.
//
// Deploy: supabase functions deploy check-admin
//
// Required env vars (set automatically by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// RLS setup required in Supabase Dashboard:
//   1. admin_users table → enable RLS → remove all policies (no anon reads/writes)
//   2. mensa_menu, campus_events, sports_schedule, campus_resources,
//      guide_content, semester_calendar, calendar_events →
//      enable RLS → add policy: anon role = SELECT only, no INSERT/UPDATE/DELETE

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STUDIP_BASE = 'https://studip.hochschule-trier.de/jsonapi.php/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { studip_username, studip_token } = await req.json();

    if (!studip_username || !studip_token) {
      return jsonResponse({ is_admin: false });
    }

    // Step 1: Verify the token is a valid Stud.IP credential
    const studipRes = await fetch(`${STUDIP_BASE}/users/me`, {
      headers: {
        Authorization: `Basic ${studip_token}`,
        Accept: 'application/vnd.api+json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!studipRes.ok) {
      return jsonResponse({ is_admin: false });
    }

    // Step 2: Verify the Stud.IP profile username matches the claimed username
    // This prevents a valid user from claiming to be a different username
    const profile = await studipRes.json();
    const verifiedUsername =
      profile?.data?.attributes?.username ??
      profile?.data?.attributes?.['user-id'] ??
      null;

    if (!verifiedUsername || verifiedUsername !== studip_username) {
      return jsonResponse({ is_admin: false });
    }

    // Step 3: Check admin_users table using service_role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase
      .from('admin_users')
      .select('studip_username')
      .eq('studip_username', studip_username)
      .maybeSingle();

    if (error) {
      console.error('admin_users query error:', error.message);
      return jsonResponse({ is_admin: false });
    }

    return jsonResponse({ is_admin: !!data });
  } catch (err) {
    console.error('check-admin error:', err);
    return jsonResponse({ is_admin: false });
  }
});
