'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { t, DEFAULT_LOCALE } from '../../lib/i18n';

export function LoginForm(): JSX.Element {
  const { login, pending, error, reset } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const locale = DEFAULT_LOCALE;

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    reset();
    try {
      await login(email, password);
      const redirect = params.get('redirect') ?? '/';
      router.replace(redirect);
      router.refresh();
    } catch {
      // error surfaced via auth context state
    }
  }

  return (
    <form className="login-form" onSubmit={onSubmit} noValidate>
      <h1>{t('appName', locale)}</h1>
      <p className="muted">{t('signInPrompt', locale)}</p>
      <label htmlFor="email">{t('email', locale)}</label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <label htmlFor="password">{t('password', locale)}</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? t('signingIn', locale) : t('signIn', locale)}
      </button>
    </form>
  );
}
