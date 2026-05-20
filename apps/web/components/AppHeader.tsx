'use client';

import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '../lib/locale-context';
import { useAuth } from '../lib/auth-context';
import { t, type Locale } from '../lib/i18n';
import type { PublicUser } from '../lib/api';

export function AppHeader({
  locale: initialLocale,
  user,
}: {
  locale: Locale;
  user: PublicUser | null;
}): JSX.Element {
  // The provider's locale is the source of truth once mounted; on the
  // server the initial prop wins.
  let locale = initialLocale;
  let setLocale: (l: Locale) => void = () => undefined;
  try {
    const ctx = useLocale();
    locale = ctx.locale;
    setLocale = ctx.setLocale;
  } catch {
    // not inside the provider — render with the SSR locale
  }
  const auth = (() => {
    try {
      return useAuth();
    } catch {
      return null;
    }
  })();
  const router = useRouter();

  const toggle = () => setLocale(locale === 'ar' ? 'en' : 'ar');

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <header className="app-header-bar" role="banner">
      <div className="brand">{t('appName', locale)}</div>
      <div className="header-actions">
        <button
          type="button"
          className="locale-toggle"
          onClick={toggle}
          aria-label={t('toggleLocale', locale)}
        >
          {t('toggleLocale', locale)}
        </button>
        {user && (
          <>
            <span className="user-pill" title={user.email}>
              {user.name}
            </span>
            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
            >
              {t('signOut', locale)}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
