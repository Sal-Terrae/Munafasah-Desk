import { type Locale, t } from '../lib/i18n';
import type { DashboardData } from '../lib/api';

export function KPIStrip({
  kpis,
  locale,
}: {
  kpis: DashboardData['kpis'];
  locale: Locale;
}): JSX.Element {
  const cards = [
    { key: 'openTenders' as const, value: kpis.openTenders },
    { key: 'bidReady' as const, value: kpis.bidReady },
    { key: 'criticalGaps' as const, value: kpis.criticalGaps },
    { key: 'expiringDocs' as const, value: kpis.expiringDocs },
  ];
  return (
    <section className="kpi-strip" aria-label={t('dashboard', locale)}>
      {cards.map((c) => (
        <div key={c.key} className="kpi-card">
          <div className="kpi-label">{t(c.key, locale)}</div>
          <div className="kpi-value">{c.value}</div>
        </div>
      ))}
    </section>
  );
}
