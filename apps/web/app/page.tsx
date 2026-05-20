import type { JSX } from 'react';
import {
  apiFetch,
  ApiError,
  loadCurrentUser,
  type DocumentSummary,
  type Tender,
} from '../lib/api';
import { dashboardFixture } from '../lib/fixtures';
import { t } from '../lib/i18n';
import { resolveServerLocale } from '../lib/locale';
import { KPIStrip } from '../components/KPIStrip';
import { TenderFeed } from '../components/TenderFeed';
import { TaskRail } from '../components/TaskRail';
import { ExpiryRadar } from '../components/ExpiryRadar';
import { AppShell } from '../components/AppShell';

interface DashboardLoad {
  tenders: Tender[];
  expiring: DocumentSummary[];
  loadError: boolean;
}

async function loadDashboard(): Promise<DashboardLoad> {
  try {
    const [tenders, expiring] = await Promise.all([
      apiFetch<Tender[]>('/tenders'),
      apiFetch<DocumentSummary[]>('/documents/expiring'),
    ]);
    return { tenders, expiring, loadError: false };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      return { tenders: [], expiring: [], loadError: false };
    }
    return { tenders: [], expiring: [], loadError: true };
  }
}

export default async function Home(): Promise<JSX.Element> {
  const [user, locale, dash] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    loadDashboard(),
  ]);
  const { tenders, expiring, loadError } = dash;
  const criticalTasks = dashboardFixture.criticalTasks;

  const kpis = {
    openTenders: tenders.length,
    bidReady: tenders.filter((tender) => tender.status === 'ready').length,
    criticalGaps: criticalTasks.filter((c) => c.risk === 'critical').length,
    expiringDocs: expiring.length,
  };

  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('dashboard', locale)}</h1>
      </header>
      {loadError && (
        <p role="alert" className="form-error">
          {t('loadFailed', locale)}
        </p>
      )}
      <KPIStrip kpis={kpis} locale={locale} />
      <div className="grid-2">
        {tenders.length === 0 ? (
          <section className="panel empty">
            <h2>{t('tenderFeed', locale)}</h2>
            <p className="muted">{t('emptyTenders', locale)}</p>
          </section>
        ) : (
          <TenderFeed tenders={tenders} locale={locale} />
        )}
        <div className="stack">
          {criticalTasks.length === 0 ? (
            <section className="panel empty">
              <h2>{t('taskRail', locale)}</h2>
              <p className="muted">{t('emptyTasks', locale)}</p>
            </section>
          ) : (
            <TaskRail tasks={criticalTasks} locale={locale} />
          )}
          {expiring.length === 0 ? (
            <section className="panel empty">
              <h2>{t('expiryRadar', locale)}</h2>
              <p className="muted">{t('emptyExpiring', locale)}</p>
            </section>
          ) : (
            <ExpiryRadar docs={expiring} locale={locale} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
