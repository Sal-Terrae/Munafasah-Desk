import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  adminApi,
  loadCurrentUser,
  type IngestionRunSummary,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type Locale } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { TriggerIngestionForm } from './trigger-form';

export const dynamic = 'force-dynamic';

export default async function IngestionRunsPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);

  let runs: IngestionRunSummary[] = [];
  let loadError: 'forbidden' | 'unreachable' | 'fail' | null = null;
  try {
    runs = await adminApi.listIngestionRuns(50);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) loadError = 'forbidden';
    else if (err instanceof ApiError && err.status === 503)
      loadError = 'unreachable';
    else loadError = 'fail';
  }

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/admin" className="muted breadcrumb">
        {t('backToAdmin', locale)}
      </Link>
      <header className="page-header">
        <h1>{t('ingestionRunsTitle', locale)}</h1>
        <p className="muted">{t('ingestionRunsLead', locale)}</p>
      </header>

      <TriggerIngestionForm locale={locale} />

      <section className="panel">
        <header className="panel-header">
          <h2>{t('ingestionRunsTitle', locale)}</h2>
        </header>
        {loadError === 'forbidden' && (
          <p role="alert" className="form-error">
            {t('accessDenied', locale)}
          </p>
        )}
        {loadError === 'unreachable' && (
          <p role="alert" className="form-error">
            ingestion service unreachable — check INGESTION_SERVICE_URL +
            INGESTION_TRIGGER_TOKEN on the admin portal.
          </p>
        )}
        {loadError === 'fail' && (
          <p role="alert" className="form-error">
            {t('loadFailed', locale)}
          </p>
        )}
        {!loadError && runs.length === 0 ? (
          <p className="muted">{t('ingestionNoRuns', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('ingestionSource', locale)}</th>
                <th scope="col">{t('ingestionStarted', locale)}</th>
                <th scope="col">{t('ingestionStatus', locale)}</th>
                <th scope="col">{t('ingestionCounters', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.source?.code ?? r.sourceId.slice(0, 8)}</td>
                  <td className="muted">{fmt(r.startedAt, locale)}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td className="muted small">
                    d={r.discoveredCount} · c={r.capturedCount} · n=
                    {r.normalisedCount} · e={r.enrichedCount} · ready=
                    {r.curationReadyCount} · rej={r.rejectedCount}
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

function fmt(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleString(
      locale === 'ar' ? 'ar-SA' : 'en-GB',
    );
  } catch {
    return iso;
  }
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === 'completed'
      ? 'chip-active'
      : status === 'failed'
        ? 'chip-restricted'
        : status === 'running'
          ? 'chip-expiring'
          : '';
  return <span className={`chip ${cls}`}>{status}</span>;
}
