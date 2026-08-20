'use client';

import { getSupabaseClient } from './supabaseClient';

export function signInWithGoogle() {
  window.location.assign('/auth/signin/google');
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
