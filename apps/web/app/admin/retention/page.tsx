import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  adminApi,
  loadCurrentUser,
  type RetentionAction,
  type RetentionActionStatus,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type Locale, type StringKey } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { RetentionRowActions } from './retention-actions';
import { ManualSweepButton } from './manual-sweep';

export const dynamic = 'force-dynamic';

const STATUSES: { value: RetentionActionStatus | ''; labelKey: StringKey }[] = [
  { value: '', labelKey: 'filterAll' },
  { value: 'pending', labelKey: 'filterPending' },
  { value: 'approved', labelKey: 'filterApproved' },
  { value: 'denied', labelKey: 'filterDenied' },
  { value: 'executed', labelKey: 'filterExecuted' },
];

export default async function RetentionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}): Promise<JSX.Element> {
  const [user, locale, sp] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    searchParams,
  ]);
  const status = (
    ['pending', 'approved', 'denied', 'executed'].includes(sp.status ?? '')
      ? sp.status
      : undefined
  ) as RetentionActionStatus | undefined;

  let rows: RetentionAction[] = [];
  let loadError: 'forbidden' | 'fail' | null = null;
  try {
    rows = await adminApi.listRetentionActions(status);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) loadError = 'forbidden';
    else loadError = 'fail';
  }

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/admin" className="muted breadcrumb">
        {t('backToAdmin', locale)}
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1>{t('adminCardRetention', locale)}</h1>
          <p className="muted">{t('adminCardRetentionDesc', locale)}</p>
        </div>
        <ManualSweepButton locale={locale} />
      </header>

      <section className="panel">
        <header className="panel-header">
          <h2>{t('adminCardRetention', locale)}</h2>
          <StatusFilter current={status} locale={locale} />
        </header>
        {loadError === 'fail' && (
          <p role="alert" className="form-error">
            {t('loadFailed', locale)}
          </p>
        )}
        {rows.length === 0 ? (
          <p className="muted">{t('noResults', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('kind', locale)}</th>
                <th scope="col">documentId</th>
                <th scope="col">reason</th>
                <th scope="col">{t('status', locale)}</th>
                <th scope="col">requestedBy</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.action}</td>
                  <td className="mono">{row.documentId.slice(0, 8)}…</td>
                  <td>{row.reason}</td>
                  <td>
                    <StatusChip status={row.status} locale={locale} />
                  </td>
                  <td className="muted mono">{row.requestedBy.slice(0, 8)}…</td>
                  <td>
                    <RetentionRowActions row={row} locale={locale} />
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

function StatusFilter({
  current,
  locale,
}: {
  current: RetentionActionStatus | undefined;
  locale: Locale;
}) {
  return (
    <div className="filter-row">
      {STATUSES.map((s) => (
        <Link
          key={s.value || 'all'}
          href={s.value ? `/admin/retention?status=${s.value}` : '/admin/retention'}
          className={`chip ${current === s.value || (!current && !s.value) ? 'chip-active' : ''}`}
        >
          {t(s.labelKey, locale)}
        </Link>
      ))}
    </div>
  );
}

function StatusChip({
  status,
  locale,
}: {
  status: RetentionActionStatus;
  locale: Locale;
}) {
  const key: StringKey =
    status === 'pending'
      ? 'filterPending'
      : status === 'approved'
        ? 'filterApproved'
        : status === 'denied'
          ? 'filterDenied'
          : 'filterExecuted';
  return <span className={`chip chip-${status}`}>{t(key, locale)}</span>;
}
