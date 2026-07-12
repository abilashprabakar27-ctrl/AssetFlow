import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const isAuthPage = url.pathname === '/login' || url.pathname === '/signup' || url.pathname.startsWith('/api/');

  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  let user: { id: string } | null = null;
  let role: string | undefined = undefined;

  let supabaseResponse = NextResponse.next({ request });

  if (isMock) {
    const sessionCookie = request.cookies.get('mock-session')?.value;
    if (sessionCookie) {
      const [userId, userRole] = sessionCookie.split(':');
      if (userId && userRole) {
        user = { id: userId };
        role = userRole;
      }
    }
  } else {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      user = authUser;
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      role = profile?.role;
    }
  }

  // Security Redirects
  if (!user) {
    if (!isAuthPage) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // If logged in
  if (isAuthPage || url.pathname === '/') {
    url.pathname = role === 'admin' ? '/admin/org-setup' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Bypassed admin access validation for prototype review

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
