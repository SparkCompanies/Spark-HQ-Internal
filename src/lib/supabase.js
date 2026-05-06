import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'openid email profile User.Read',
      redirectTo: window.location.origin + import.meta.env.BASE_URL
    }
  });
  if (error) {
    console.error('[Auth] sign-in failed:', error);
    throw error;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[Auth] sign-out failed:', error);
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('hq_user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) {
    console.error('[Profile] read failed:', error);
    return null;
  }
  return data;
}

export async function ensureProfile(session) {
  if (!session?.user) return null;
  const { user } = session;
  const email = user.email || user.user_metadata?.email;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email;

  const existing = await getMyProfile();
  if (existing) return existing;

  const { data, error } = await supabase
    .from('hq_user_profiles')
    .insert({
      id: user.id,
      email,
      full_name: fullName,
      user_group: 'All Employees'
    })
    .select()
    .single();
  if (error) {
    console.error('[Profile] insert failed:', error);
    return null;
  }
  return data;
}
