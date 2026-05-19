import { notFound } from 'next/navigation';
import { tenderFixture } from '../../../lib/fixtures';
import { DEFAULT_LOCALE, t } from '../../../lib/i18n';

export default function TenderWorkspace({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  const tender = tenderFixture[params.id];
  if (!tender) {
    notFound();
  }
  const locale = DEFAULT_LOCALE;
  return (
    <main>
      <a href="/" className="muted">← {t('dashboard', locale)}</a>
      <h1>{tender.title}</h1>
      <div className="meta-row">
        <span>{t('status', locale)}: {tender.status}</span>
        <span className="muted">source: {tender.source}</span>
      </div>
      <section className="panel">
        <h2>{t('taskRail', locale)}</h2>
        <p className="muted">
          Compliance matrix + vault wired in the next deployment phase.
        </p>
      </section>
    </main>
  );
}
