'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { apiFetch, type PublicUser } from './api';

interface AuthState {
  user: PublicUser | null;
  pending: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: PublicUser | null;
}): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setPending(true);
      setError(null);
      try {
        const result = await apiFetch<{ user: PublicUser }>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        setUser(result.user);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? 'Invalid credentials'
            : 'Sign-in failed';
        setError(message);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort: the HttpOnly cookie is server-controlled and
      // we always want to clear local state on the user's request.
    } finally {
      setUser(null);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, pending, error, login, logout, reset }),
    [user, pending, error, login, logout, reset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
