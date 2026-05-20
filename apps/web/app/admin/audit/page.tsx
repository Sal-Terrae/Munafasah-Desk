import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  apiFetch,
  loadCurrentUser,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  timestamp: string;
  details: unknown;
}

export default async function AuditPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  let rows: AuditRow[] = [];
  let loadError: 'forbidden' | 'fail' | null = null;
  try {
    rows = await apiFetch<AuditRow[]>('/audit-events?limit=100');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) loadError = 'forbidden';
    else if (!(err instanceof ApiError && err.status === 401)) loadError = 'fail';
  }

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/admin" className="muted breadcrumb">
        {t('backToAdmin', locale)}
      </Link>
      <header className="page-header">
        <h1>{t('auditTitle', locale)}</h1>
        <p className="muted">{t('adminCardAuditDesc', locale)}</p>
      </header>
      {loadError === 'forbidden' && (
        <p role="alert" className="form-error">
          {t('accessDenied', locale)}
        </p>
      )}
      {loadError === 'fail' && (
        <p role="alert" className="form-error">
          {t('loadFailed', locale)}
        </p>
      )}
      <section className="panel">
        {rows.length === 0 && !loadError ? (
          <p className="muted">{t('noResults', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('auditTimestamp', locale)}</th>
                <th scope="col">{t('auditAction', locale)}</th>
                <th scope="col">{t('auditEntity', locale)}</th>
                <th scope="col">{t('auditUser', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="muted">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className="chip">{row.action}</span>
                  </td>
                  <td className="mono">
                    {row.entityType}/{row.entityId.slice(0, 8)}…
                  </td>
                  <td className="mono muted">
                    {row.userId ? (
                      `${row.userId.slice(0, 8)}…`
                    ) : (
                      <span className="chip chip-denied">
                        {t('auditAnonymised', locale)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
