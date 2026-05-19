import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, loadCurrentUser, apiBaseUrl } from '../../lib/api';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function ok(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('sends GET with credentials:"include" in the browser and no body', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(ok({ ok: 1 }));
    await apiFetch('/foo');
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${apiBaseUrl}/foo`);
    expect(init.credentials).toBe('include');
    expect(init.body).toBeUndefined();
    expect(init.cache).toBe('no-store');
  });

  it('serialises object bodies as JSON and sets Content-Type', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(ok({ user: { id: '1' } }));
    await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.c', password: 'longenough' },
    });
    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({ email: 'a@b.c', password: 'longenough' }),
    );
    expect((init.headers as Headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('throws ApiError on non-2xx, exposing status + body', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({ message: 'Invalid credentials' }, 401),
    );
    let caught: unknown;
    try {
      await apiFetch('/auth/me');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(401);
    expect((caught as ApiError).body).toMatchObject({
      message: 'Invalid credentials',
    });
  });

  it('returns undefined for 204 No Content', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const result = await apiFetch<void>('/auth/logout', { method: 'POST' });
    expect(result).toBeUndefined();
  });
});

describe('loadCurrentUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null on 401 (no active session) rather than throwing', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('{}', { status: 401 }),
    );
    expect(await loadCurrentUser()).toBeNull();
  });

  it('returns the user on 200', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'u-1',
          email: 'o@a.test',
          name: 'O',
          role: 'Owner',
          organizationId: 'org-1',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const user = await loadCurrentUser();
    expect(user).toMatchObject({ id: 'u-1', role: 'Owner' });
  });

  it('rethrows on unexpected status (5xx)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('{}', { status: 502 }),
    );
    await expect(loadCurrentUser()).rejects.toBeInstanceOf(ApiError);
  });
});
