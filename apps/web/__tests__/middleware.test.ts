import { describe, expect, it, vi } from 'vitest';

const { next, redirect } = vi.hoisted(() => ({
  next: vi.fn(() => ({ kind: 'next' })),
  redirect: vi.fn((url: URL) => ({ kind: 'redirect', url })),
}));

vi.mock('next/server', () => ({
  NextResponse: { next, redirect },
}));

import { middleware } from '../middleware';

function req(pathname: string, sessionCookie?: string) {
  const url = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl: {
      pathname: url.pathname,
      clone: () => new URL(url.toString()),
    },
    cookies: {
      get: (name: string) =>
        name === 'bidready_session' && sessionCookie
          ? { value: sessionCookie }
          : undefined,
    },
  };
}

describe('middleware', () => {
  it('passes /login through without checking session', () => {
    middleware(req('/login') as never);
    expect(next).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    next.mockReset();
  });

  it('passes through when the session cookie is present', () => {
    middleware(req('/', 'jwt-here') as never);
    expect(next).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    next.mockReset();
  });

  it('redirects to /login when no session cookie is present', () => {
    middleware(req('/tenders/t-1') as never);
    expect(redirect).toHaveBeenCalledTimes(1);
    const url = redirect.mock.calls[0][0];
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/tenders/t-1');
    redirect.mockReset();
  });

  it('does not attach ?redirect for the root path', () => {
    middleware(req('/') as never);
    expect(redirect).toHaveBeenCalled();
    const url = redirect.mock.calls[0][0];
    expect(url.searchParams.get('redirect')).toBeNull();
    redirect.mockReset();
  });
});
