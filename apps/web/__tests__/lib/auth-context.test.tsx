import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../lib/auth-context';

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function Probe(): JSX.Element {
  const { user, pending, error, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user">{user?.email ?? 'none'}</div>
      <div data-testid="pending">{pending ? 'yes' : 'no'}</div>
      <div data-testid="error">{error ?? 'no-error'}</div>
      <button
        onClick={() => {
          login('owner@acme.test', 'pw-correct').catch(() => {});
        }}
      >
        do-login
      </button>
      <button
        onClick={() => {
          logout().catch(() => {});
        }}
      >
        do-logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login() sets the user on 200 and clears error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({
        user: {
          id: 'u-1',
          email: 'owner@acme.test',
          name: 'O',
          role: 'Owner',
          organizationId: 'org-1',
        },
      }),
    );
    render(
      <AuthProvider initialUser={null}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
    await userEvent.click(screen.getByText('do-login'));
    expect(screen.getByTestId('user').textContent).toBe('owner@acme.test');
    expect(screen.getByTestId('error').textContent).toBe('no-error');
  });

  it('login() surfaces an error and leaves user null on 401', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({ message: 'Invalid credentials' }, 401),
    );
    render(
      <AuthProvider initialUser={null}>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await userEvent.click(screen.getByText('do-login'));
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('error').textContent).toMatch(/Invalid|Sign-in/);
  });

  it('logout() clears the user even if the request fails', async () => {
    const initial = {
      id: 'u-1',
      email: 'owner@acme.test',
      name: 'O',
      role: 'Owner',
      organizationId: 'org-1',
    };
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    render(
      <AuthProvider initialUser={initial}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('user').textContent).toBe('owner@acme.test');
    await act(async () => {
      await userEvent.click(screen.getByText('do-logout'));
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('useAuth outside <AuthProvider> throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/must be used inside/);
    spy.mockRestore();
  });
});
