'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { signInWithGoogle } from '@/lib/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Google sign-in.');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl">🇰🇷</div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">K-ROADMAP</p>
        <h1 className="text-3xl font-bold text-white">Keep your journey with you.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Sign in to prepare K-Roadmap for multi-device access. Your existing local progress is not uploaded in this phase.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <span className="text-base">G</span>}
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-300">{error}</p>}

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-5 text-slate-500">Login does not import or overwrite your existing localStorage data. Cloud migration comes later and will require explicit confirmation.</p>
        </div>

        <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white">
          Continue as guest <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
