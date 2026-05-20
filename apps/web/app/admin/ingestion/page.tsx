import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  adminApi,
  loadCurrentUser,
  type IngestionJob,
  type IngestionKind,
  type IngestionStatus,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type Locale, type StringKey } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { EtimadEnqueueForm } from './etimad-enqueue-form';

export const dynamic = 'force-dynamic';

const STATUSES: { value: IngestionStatus | ''; labelKey: StringKey }[] = [
  { value: '', labelKey: 'filterAll' },
  { value: 'pending', labelKey: 'filterPending' },
  { value: 'processing', labelKey: 'filterProcessing' },
  { value: 'completed', labelKey: 'filterCompleted' },
  { value: 'failed', labelKey: 'filterFailed' },
];

const KINDS: { value: IngestionKind | ''; labelKey: StringKey }[] = [
  { value: '', labelKey: 'filterAll' },
  { value: 'etimad', labelKey: 'kindEtimad' },
  { value: 'upload', labelKey: 'kindUpload' },
  { value: 'email', labelKey: 'kindEmail' },
  { value: 'link', labelKey: 'kindLink' },
];

const KIND_KEY: Record<IngestionKind, StringKey> = {
  etimad: 'kindEtimad',
  upload: 'kindUpload',
  email: 'kindEmail',
  link: 'kindLink',
};

export default async function IngestionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}): Promise<JSX.Element> {
  const [user, locale, sp] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    searchParams,
  ]);
  const status = (
    ['pending', 'processing', 'completed', 'failed'].includes(sp.status ?? '')
      ? sp.status
      : undefined
  ) as IngestionStatus | undefined;
  const kind = (
    ['etimad', 'upload', 'email', 'link'].includes(sp.kind ?? '')
      ? sp.kind
      : undefined
  ) as IngestionKind | undefined;

  let rows: IngestionJob[] = [];
  let loadError: 'forbidden' | 'fail' | null = null;
  try {
    rows = await adminApi.listIngestions(status, kind);
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
        <h1>{t('adminCardIngestion', locale)}</h1>
        <p className="muted">{t('adminCardIngestionDesc', locale)}</p>
      </header>

      <section className="panel">
        <h2>{t('enqueue', locale)} — {t('kindEtimad', locale)}</h2>
        <EtimadEnqueueForm locale={locale} />
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>{t('adminCardIngestion', locale)}</h2>
          <div className="filter-cluster">
            <FilterRow current={status} options={STATUSES} param="status" prefix="/admin/ingestion" extra={kind ? { kind } : {}} locale={locale} />
            <FilterRow current={kind} options={KINDS} param="kind" prefix="/admin/ingestion" extra={status ? { status } : {}} locale={locale} />
          </div>
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
                <th scope="col">{t('status', locale)}</th>
                <th scope="col">{t('attempts', locale)}</th>
                <th scope="col">created</th>
                <th scope="col">{t('errorMessage', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{t(KIND_KEY[row.kind], locale)}</td>
                  <td>
                    <span className={`chip chip-${row.status}`}>{row.status}</span>
                  </td>
                  <td className="muted">{row.attempts}</td>
                  <td className="muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="muted small">{row.errorMessage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}

function FilterRow<V extends string>({
  current,
  options,
  param,
  prefix,
  extra,
  locale,
}: {
  current: V | undefined;
  options: { value: V | ''; labelKey: StringKey }[];
  param: string;
  prefix: string;
  extra: Record<string, string>;
  locale: Locale;
}) {
  function hrefFor(value: string): string {
    const sp = new URLSearchParams({ ...extra });
    if (value) sp.set(param, value);
    const qs = sp.toString();
    return qs ? `${prefix}?${qs}` : prefix;
  }
  return (
    <div className="filter-row">
      {options.map((o) => (
        <Link
          key={o.value || 'all'}
          href={hrefFor(o.value)}
          className={`chip ${current === o.value || (!current && !o.value) ? 'chip-active' : ''}`}
        >
          {t(o.labelKey, locale)}
        </Link>
      ))}
    </div>
  );
}
