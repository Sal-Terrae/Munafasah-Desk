import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  adminApi,
  loadCurrentUser,
  type DpoTrainingRecord,
  type DpoTrainingSummary,
  type TrainingExpiryStatus,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type Locale, type StringKey } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { TrainingRegisterForm } from './training-register-form';
import { TrainingRowActions } from './training-row-actions';

export const dynamic = 'force-dynamic';

const FILTERS: { value: TrainingExpiryStatus | 'all'; labelKey: StringKey }[] = [
  { value: 'all', labelKey: 'trainingFilterAll' },
  { value: 'active', labelKey: 'trainingFilterActive' },
  { value: 'expiring', labelKey: 'trainingFilterExpiring' },
  { value: 'expired', labelKey: 'trainingFilterExpired' },
  { value: 'no-expiry', labelKey: 'trainingFilterNoExpiry' },
];

function parseStatus(v: string | undefined): TrainingExpiryStatus | 'all' {
  if (v === 'active' || v === 'expiring' || v === 'expired' || v === 'no-expiry') {
    return v;
  }
  return 'all';
}

export default async function TrainingRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}): Promise<JSX.Element> {
  const [user, locale, sp] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    searchParams,
  ]);
  const status = parseStatus(sp.status);

  let rows: DpoTrainingRecord[] = [];
  let summary: DpoTrainingSummary | null = null;
  let loadError: 'forbidden' | 'fail' | null = null;
  try {
    [rows, summary] = await Promise.all([
      adminApi.listTrainingRecords(status),
      adminApi.trainingRecordsSummary(),
    ]);
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
        <h1>{t('trainingTitle', locale)}</h1>
        <p className="muted">{t('trainingLead', locale)}</p>
      </header>

      {summary && (
        <section className="kpi-strip">
          <KPI labelKey="trainingTotalLabel" value={summary.total} locale={locale} />
          <KPI labelKey="trainingStatusActive" value={summary.active} locale={locale} />
          <KPI
            labelKey="trainingStatusExpiring"
            value={summary.expiring}
            locale={locale}
          />
          <KPI labelKey="trainingStatusExpired" value={summary.expired} locale={locale} />
          <KPI
            labelKey="trainingStatusNoExpiry"
            value={summary.noExpiry}
            locale={locale}
          />
        </section>
      )}

      <TrainingRegisterForm locale={locale} />

      <section className="panel">
        <header className="panel-header">
          <h2>{t('trainingTitle', locale)}</h2>
          <Filter current={status} locale={locale} />
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
        {!loadError && rows.length === 0 ? (
          <p className="muted">{t('trainingNoRecords', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('trainingSubjectName', locale)}</th>
                <th scope="col">{t('trainingSubjectEmail', locale)}</th>
                <th scope="col">{t('trainingTopic', locale)}</th>
                <th scope="col">{t('trainingCompletedAt', locale)}</th>
                <th scope="col">{t('trainingValidUntil', locale)}</th>
                <th scope="col">{t('status', locale)}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.subjectName}</td>
                  <td className="mono">{row.subjectEmail}</td>
                  <td>{row.topic}</td>
                  <td>{fmtDate(row.completedAt, locale)}</td>
                  <td>
                    {row.validUntil ? fmtDate(row.validUntil, locale) : '—'}
                  </td>
                  <td>
                    <ExpiryChip
                      status={row.expiryStatus}
                      days={row.daysUntilExpiry}
                      locale={locale}
                    />
                  </td>
                  <td>
                    <TrainingRowActions row={row} locale={locale} />
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

function fmtDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB');
  } catch {
    return iso.slice(0, 10);
  }
}

function KPI({
  labelKey,
  value,
  locale,
}: {
  labelKey: StringKey;
  value: number;
  locale: Locale;
}) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{t(labelKey, locale)}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
}

function Filter({
  current,
  locale,
}: {
  current: TrainingExpiryStatus | 'all';
  locale: Locale;
}) {
  return (
    <div className="filter-row">
      {FILTERS.map((f) => {
        const active = (current === 'all' && f.value === 'all') || current === f.value;
        const href =
          f.value === 'all'
            ? '/admin/training-register'
            : `/admin/training-register?status=${f.value}`;
        return (
          <Link
            key={f.value}
            href={href}
            className={`chip ${active ? 'chip-active' : ''}`}
          >
            {t(f.labelKey, locale)}
          </Link>
        );
      })}
    </div>
  );
}

function ExpiryChip({
  status,
  days,
  locale,
}: {
  status: TrainingExpiryStatus;
  days: number | null;
  locale: Locale;
}) {
  if (status === 'no-expiry') {
    return <span className="chip">{t('trainingStatusNoExpiry', locale)}</span>;
  }
  if (status === 'active') {
    return (
      <span className="chip chip-active">
        {t('trainingStatusActive', locale)}
        {days !== null && ` · ${days} ${t('trainingDaysLeft', locale)}`}
      </span>
    );
  }
  if (status === 'expiring') {
    return (
      <span className="chip chip-expiring">
        {t('trainingStatusExpiring', locale)}
        {days !== null && ` · ${days} ${t('trainingDaysLeft', locale)}`}
      </span>
    );
  }
  return (
    <span className="chip chip-restricted">
      {t('trainingStatusExpired', locale)}
      {days !== null && ` · ${Math.abs(days)} ${t('trainingDaysExpired', locale)}`}
    </span>
  );
}
