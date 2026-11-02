// Lightweight gate: redirect unauthenticated users away from protected pages.
// (Only checks that the session cookie exists. Full verification and role checks
// happen in server components and API routes, which run on Node.)
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'hms_session';

export function middleware(request) {
  if (!request.cookies.get(COOKIE_NAME)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/patients/:path*', '/appointments/:path*', '/records/:path*',
    '/doctors/:path*', '/hospitals/:path*', '/admissions/:path*', '/beds/:path*',
    '/billing/:path*', '/analytics/:path*',
  ],
};
