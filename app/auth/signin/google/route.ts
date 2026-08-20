import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(
      new URL('/login?error=oauth_config_missing', request.url),
    );
  }

  const requestUrl = new URL(request.url);
  const callbackUrl = new URL('/auth/callback', request.url);
  const next = requestUrl.searchParams.get('next');

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    callbackUrl.searchParams.set('next', next);
  }

  const cookiesToSet: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookiesToSet.push(...cookies);
      },
    },
  });

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

  const redirectResponse = NextResponse.redirect(data.url);

  for (const cookie of cookiesToSet) {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return redirectResponse;
}
