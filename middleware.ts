import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_TIMEOUT = 2 * 60 * 60; // 2 hours in seconds
const PUBLIC_PATHS = ['/', '/api/portal'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname === p)) return NextResponse.next();

  const unlocked = request.cookies.get('portal_unlocked');

  if (!unlocked) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Refresh the cookie on every request to implement sliding 2h window
  const res = NextResponse.next();
  res.cookies.set('portal_unlocked', 'true', {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TIMEOUT,
    path: '/',
  });

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
};
