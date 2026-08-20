'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finishAuth = async () => {
      const supabase = getSupabaseClient();
      const code = new URLSearchParams(window.location.search).get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        if (active) setError(sessionError?.message ?? 'Authentication session was not created.');
        return;
      }

      router.replace('/');
    };

    finishAuth().catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'Authentication failed.');
    });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-rose-300">Authentication failed</p>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">{error}</p>
          </>
        ) : (
          <>
            <Loader2 size={24} className="mx-auto animate-spin text-indigo-400" />
            <p className="mt-4 text-sm text-slate-400">Finishing sign-in...</p>
          </>
        )}
      </div>
    </main>
  );
}
