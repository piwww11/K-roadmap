'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="mt-3 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-600"><Loader2 size={14} className="animate-spin" /></div>;
  }

  if (!user) {
    return (
      <Link href="/login" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/15 hover:text-indigo-200">
        <LogIn size={14} />
        Sign in to sync later
      </Link>
    );
  }

  const label = user.email ?? user.user_metadata?.full_name ?? 'Signed in';

  return (
    <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
      <p className="truncate text-[11px] font-semibold text-emerald-300" title={label}>{label}</p>
      <p className="mt-1 text-[10px] text-slate-600">Cloud sync will be enabled in Phase 2.</p>
      <button
        type="button"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          try {
            await signOut();
            setUser(null);
          } finally {
            setSigningOut(false);
          }
        }}
        className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-500 hover:text-slate-200 disabled:opacity-50"
      >
        {signingOut ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        Sign out
      </button>
    </div>
  );
}
