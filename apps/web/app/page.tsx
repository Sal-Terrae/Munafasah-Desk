import { dashboardFixture } from '../lib/fixtures';
import { DEFAULT_LOCALE, t } from '../lib/i18n';
import { KPIStrip } from '../components/KPIStrip';
import { TenderFeed } from '../components/TenderFeed';
import { TaskRail } from '../components/TaskRail';
import { ExpiryRadar } from '../components/ExpiryRadar';

export default function Home(): JSX.Element {
  const locale = DEFAULT_LOCALE;
  const data = dashboardFixture;
  return (
    <main>
      <header className="app-header">
        <h1>{t('appName', locale)}</h1>
        <p className="muted">{t('dashboard', locale)}</p>
      </header>
      <KPIStrip kpis={data.kpis} locale={locale} />
      <div className="grid-2">
        <TenderFeed tenders={data.tenders} locale={locale} />
        <div className="stack">
          <TaskRail tasks={data.criticalTasks} locale={locale} />
          <ExpiryRadar docs={data.expiring} locale={locale} />
        </div>
      </div>
    </main>
  );
}
