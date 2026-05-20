import type { JSX } from 'react';
import Link from 'next/link';
import { loadCurrentUser } from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';
import { SettingsLocaleControl } from './settings-locale-control';
import { SettingsSignOut } from './settings-sign-out';

export const dynamic = 'force-dynamic';

export default async function SettingsPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('settingsTitle', locale)}</h1>
        <p className="muted">{t('settingsLead', locale)}</p>
      </header>

      <div className="grid-2">
        <section className="panel">
          <h2>{t('profileCard', locale)}</h2>
          {user ? (
            <ul className="kvs">
              <li>
                <span className="muted">{t('dpoName', locale)}</span>
                <strong>{user.name}</strong>
              </li>
              <li>
                <span className="muted">{t('email', locale)}</span>
                <strong>{user.email}</strong>
              </li>
              <li>
                <span className="muted">{t('role', locale)}</span>
                <span className="chip">{user.role}</span>
              </li>
            </ul>
          ) : (
            <p className="muted">{t('notSignedIn', locale)}</p>
          )}
        </section>

        <section className="panel">
          <h2>{t('organizationCard', locale)}</h2>
          {user ? (
            <ul className="kvs">
              <li>
                <span className="muted">organizationId</span>
                <span className="mono">{user.organizationId}</span>
              </li>
            </ul>
          ) : (
            <p className="muted">—</p>
          )}
        </section>

        <section className="panel">
          <h2>{t('languageCard', locale)}</h2>
          <SettingsLocaleControl locale={locale} />
        </section>

        <section className="panel">
          <h2>{t('accountActionsCard', locale)}</h2>
          <div className="stack">
            <SettingsSignOut locale={locale} />
            <p className="muted small">
              {t('yourErasureLink', locale)}{' '}
              <Link href="/admin/data-subject-requests">
                /admin/data-subject-requests
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
