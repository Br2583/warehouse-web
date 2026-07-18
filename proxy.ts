import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours inactivity
const ACTIVITY_COOKIE    = 'wm_last_active';

const PROTECTED = [
  '/dashboard', '/warehouses', '/search', '/production',
  '/stats', '/snapshots', '/chat', '/deleted', '/profile',
  '/storage', '/onboarding', '/admin-k9x2m7',
];

function isProtected(pathname: string): boolean {
  return PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function setActivityCookie(res: NextResponse): void {
  res.cookies.set(ACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24, // 24h max age; actual 2h check is done in code
    path:     '/',
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Redirect HTTP → HTTPS in production (Railway sets x-forwarded-proto)
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') === 'http'
  ) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    return NextResponse.redirect(url.toString(), { status: 301 });
  }

  // 2. Admin panel: require admin_session cookie (server-side guard)
  if (
    (pathname === '/admin-k9x2m7' || pathname.startsWith('/admin-k9x2m7/')) &&
    !pathname.startsWith('/admin-k9x2m7/login')
  ) {
    const adminSession = request.cookies.get('admin_session')?.value;
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin-k9x2m7/login', request.url));
    }
  }

  // 3. Inactivity session timeout — only on protected routes
  if (isProtected(pathname)) {
    const raw = request.cookies.get(ACTIVITY_COOKIE)?.value;
    const now = Date.now();

    if (raw) {
      const lastActive = parseInt(raw, 10);
      if (!isNaN(lastActive) && now - lastActive > SESSION_TIMEOUT_MS) {
        // Cookie exists but is stale — genuine inactivity timeout
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('session', 'expired');
        const res = NextResponse.redirect(loginUrl);
        res.cookies.delete(ACTIVITY_COOKIE);
        return res;
      }
    }

    // Cookie missing (first visit after login) OR valid — slide the window
    const res = NextResponse.next();
    setActivityCookie(res);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
};
