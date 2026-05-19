import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
const refresh = vi.fn();
const searchParamsGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: searchParamsGet }),
}));

import { LoginForm } from '../../app/login/login-form';
import { AuthProvider } from '../../lib/auth-context';

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('<LoginForm>', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    replace.mockReset();
    refresh.mockReset();
    searchParamsGet.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits credentials and redirects to "/" on success', async () => {
    searchParamsGet.mockReturnValue(null);
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
        <LoginForm />
      </AuthProvider>,
    );
    await userEvent.type(
      screen.getByLabelText(/البريد/),
      'owner@acme.test',
    );
    await userEvent.type(
      screen.getByLabelText(/كلمة المرور/),
      'pw-correct-1',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /تسجيل الدخول/ }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(replace).toHaveBeenCalledWith('/');
    expect(refresh).toHaveBeenCalled();
  });

  it('honors the ?redirect= query param after login', async () => {
    searchParamsGet.mockReturnValue('/tenders/t-99');
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
        <LoginForm />
      </AuthProvider>,
    );
    await userEvent.type(
      screen.getByLabelText(/البريد/),
      'owner@acme.test',
    );
    await userEvent.type(
      screen.getByLabelText(/كلمة المرور/),
      'pw-correct-1',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /تسجيل الدخول/ }),
    );
    expect(replace).toHaveBeenCalledWith('/tenders/t-99');
  });

  it('shows the error message on 401 and does not redirect', async () => {
    searchParamsGet.mockReturnValue(null);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({ message: 'Invalid credentials' }, 401),
    );
    render(
      <AuthProvider initialUser={null}>
        <LoginForm />
      </AuthProvider>,
    );
    await userEvent.type(
      screen.getByLabelText(/البريد/),
      'owner@acme.test',
    );
    await userEvent.type(
      screen.getByLabelText(/كلمة المرور/),
      'wrong-pwd',
    );
    await act(async () => {
      await userEvent.click(
        screen.getByRole('button', { name: /تسجيل الدخول/ }),
      );
    });
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
