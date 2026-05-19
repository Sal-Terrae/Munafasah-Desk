import type { JSX } from 'react';
import {
  apiFetch,
  ApiError,
  type DocumentSummary,
  type Tender,
} from '../lib/api';
import { dashboardFixture } from '../lib/fixtures';
import { DEFAULT_LOCALE, t } from '../lib/i18n';
import { KPIStrip } from '../components/KPIStrip';
import { TenderFeed } from '../components/TenderFeed';
import { TaskRail } from '../components/TaskRail';
import { ExpiryRadar } from '../components/ExpiryRadar';

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
  const locale = DEFAULT_LOCALE;
  const { tenders, expiring, loadError } = await loadDashboard();

  // Critical-tasks rail still uses fixture shapes until P10 persists
  // the compliance matrix items (see docs/audit-findings.md §3).
  const criticalTasks = dashboardFixture.criticalTasks;

  const kpis = {
    openTenders: tenders.length,
    bidReady: tenders.filter((t) => t.status === 'ready').length,
    criticalGaps: criticalTasks.filter((c) => c.risk === 'critical').length,
    expiringDocs: expiring.length,
  };

  return (
    <main>
      <header className="app-header">
        <h1>{t('appName', locale)}</h1>
        <p className="muted">{t('dashboard', locale)}</p>
      </header>
      {loadError && (
        <p role="alert" className="form-error">
          {t('loadFailed', locale)}
        </p>
      )}
      <KPIStrip kpis={kpis} locale={locale} />
      <div className="grid-2">
        <TenderFeed tenders={tenders} locale={locale} />
        <div className="stack">
          <TaskRail tasks={criticalTasks} locale={locale} />
          <ExpiryRadar docs={expiring} locale={locale} />
        </div>
      </div>
    </main>
  );
}
