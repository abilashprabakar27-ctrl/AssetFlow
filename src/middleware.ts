import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  const isAuthPage = url.pathname === '/login' || url.pathname === '/signup';
  if (!user) {
    if (!isAuthPage) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  const role = profile?.role;
  if (isAuthPage || url.pathname === '/') {
    url.pathname = role === 'admin' ? '/admin/org-setup' : '/dashboard';
    return NextResponse.redirect(url);
  }
  if (role === 'admin') {
    if (!url.pathname.startsWith('/admin')) {
      url.pathname = '/admin/org-setup';
      return NextResponse.redirect(url);
    }
  } else {
    if (url.pathname.startsWith('/admin')) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }
  return supabaseResponse;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
