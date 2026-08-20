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

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: {
        name: string;
        value: string;
        options: CookieOptions;
      }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
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
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });

  return redirectResponse;
}
