import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const requestUrl = new URL(request.url);
  const callbackUrl = new URL('/auth/callback', request.url);

  const next = requestUrl.searchParams.get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    callbackUrl.searchParams.set('next', next);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'oauth_start_failed');
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(data.url);
}
