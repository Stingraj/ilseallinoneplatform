import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isStudioOwner } from '@/lib/auth/owner';

const LEGACY_DASHBOARD_ROUTES: [RegExp, string][] = [
  [/^\/dashboard\/artworks\/new\/?$/, '/studio/archive/new'],
  [/^\/dashboard\/artworks\/([^/]+)\/?$/, '/studio/archive/$1'],
  [/^\/dashboard\/catalog\/?$/, '/studio/archive/catalog'],
  [/^\/dashboard\/sales\/?$/, '/studio/sales'],
  [/^\/dashboard\/profile\/?$/, '/studio/website/profile'],
  [/^\/dashboard(\/artworks)?\/?$/, '/studio/archive'],
];

/** Refreshes the Supabase session cookie and keeps everyone but the studio owner out of /studio. */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bookmarks to the old archive dashboard keep working.
  for (const [pattern, target] of LEGACY_DASHBOARD_ROUTES) {
    if (pattern.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(pattern, target);
      return NextResponse.redirect(url, 308);
    }
  }

  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isStudio = pathname === '/studio' || pathname.startsWith('/studio/');

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isStudio) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not put logic between createServerClient and getUser: getUser validates the token with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isStudio && !isStudioOwner(user)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = user ? '?error=not-owner' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && isStudioOwner(user)) {
    const url = request.nextUrl.clone();
    url.pathname = '/studio';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
