import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  adminApi,
  loadCurrentUser,
  type DataSubjectRequest,
  type DataSubjectRequestStatus,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type Locale, type StringKey } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { DsrCreateForm } from './dsr-create-form';
import { DsrActions } from './dsr-actions';

export const dynamic = 'force-dynamic';

const STATUSES: { value: DataSubjectRequestStatus | ''; labelKey: StringKey }[] = [
  { value: '', labelKey: 'filterAll' },
  { value: 'pending', labelKey: 'filterPending' },
  { value: 'approved', labelKey: 'filterApproved' },
  { value: 'denied', labelKey: 'filterDenied' },
  { value: 'completed', labelKey: 'filterCompleted' },
];

export default async function DsrPage({
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
    ['pending', 'approved', 'denied', 'completed'].includes(sp.status ?? '')
      ? sp.status
      : undefined
  ) as DataSubjectRequestStatus | undefined;

  let rows: DataSubjectRequest[] = [];
  let loadError: 'forbidden' | 'fail' | null = null;
  try {
    rows = await adminApi.listDataSubjectRequests(status);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) loadError = 'forbidden';
    else loadError = 'fail';
  }

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/admin" className="muted breadcrumb">
        {t('backToAdmin', locale)}
      </Link>
      <header className="page-header">
        <h1>{t('adminCardDsr', locale)}</h1>
        <p className="muted">{t('adminCardDsrDesc', locale)}</p>
      </header>

      <section className="panel">
        <h2>{t('recordEvent', locale)}</h2>
        <DsrCreateForm locale={locale} />
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>{t('adminCardDsr', locale)}</h2>
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
                <th scope="col">{t('subjectEmail', locale)}</th>
                <th scope="col">{t('requestType', locale)}</th>
                <th scope="col">{t('status', locale)}</th>
                <th scope="col">{t('due', locale)}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.subjectEmail}</td>
                  <td>
                    {t(
                      row.type === 'access'
                        ? 'dsrAccess'
                        : row.type === 'erasure'
                          ? 'dsrErasure'
                          : 'dsrRectification',
                      locale,
                    )}
                  </td>
                  <td>
                    <StatusChip status={row.status} locale={locale} />
                  </td>
                  <td className="muted">
                    {new Date(row.requestedAt).toLocaleString()}
                  </td>
                  <td>
                    <DsrActions row={row} locale={locale} />
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
  current: DataSubjectRequestStatus | undefined;
  locale: Locale;
}) {
  return (
    <div className="filter-row" role="tablist" aria-label={t('filterByStatus', locale)}>
      {STATUSES.map((s) => (
        <Link
          key={s.value || 'all'}
          href={s.value ? `/admin/data-subject-requests?status=${s.value}` : '/admin/data-subject-requests'}
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
  status: DataSubjectRequestStatus;
  locale: Locale;
}) {
  const key: StringKey =
    status === 'pending'
      ? 'filterPending'
      : status === 'approved'
        ? 'filterApproved'
        : status === 'denied'
          ? 'filterDenied'
          : 'filterCompleted';
  return <span className={`chip chip-${status}`}>{t(key, locale)}</span>;
}
