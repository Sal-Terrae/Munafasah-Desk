import type { JSX, ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import type { Locale } from '../lib/i18n';
import type { PublicUser } from '../lib/api';
import { t } from '../lib/i18n';

export function AppShell({
  children,
  locale,
  user,
}: {
  children: ReactNode;
  locale: Locale;
  user: PublicUser | null;
}): JSX.Element {
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {t('skipToContent', locale)}
      </a>
      <AppHeader locale={locale} user={user} />
      <div className="app-body">
        <AppSidebar locale={locale} />
        <main id="main" className="app-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
