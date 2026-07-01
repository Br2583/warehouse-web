import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Redirect HTTP → HTTPS in production (Railway sets x-forwarded-proto)
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') === 'http'
  ) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    return NextResponse.redirect(url.toString(), { status: 301 });
  }

  const path = request.nextUrl.pathname;

  // Public paths that don't require the portal code
  const publicExact = ['/', '/terms'];
  const publicPrefixes = [
    '/_next', '/favicon', '/icons', '/sw.js', '/manifest',
    '/api/portal', '/api/auth',
  ];

  if (
    publicExact.includes(path) ||
    publicPrefixes.some(prefix => path.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // Enforce portal_unlocked cookie
  const portalCookie = request.cookies.get('portal_unlocked');
  if (!portalCookie || portalCookie.value !== 'true') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Refresh the sliding 2-hour window
  const res = NextResponse.next();
  res.cookies.set('portal_unlocked', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2,
    path: '/',
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
};
