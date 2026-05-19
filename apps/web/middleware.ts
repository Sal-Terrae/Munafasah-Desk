import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'bidready_session';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (pathname === '/login') {
    return NextResponse.next();
  }
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Run the middleware on every page route EXCEPT static assets, the
// Next.js internals, and /login itself. Pages still re-validate
// server-side via apiFetch, so a tampered/forged cookie just yields a
// 401 from the API.
export const config = {
  matcher: ['/((?!_next|favicon\\.ico|robots\\.txt|api/).*)'],
};
