import { type Locale, t } from '../lib/i18n';
import type { Tender } from '../lib/api';

export function TenderFeed({
  tenders,
  locale,
}: {
  tenders: Tender[];
  locale: Locale;
}): JSX.Element {
  return (
    <section className="panel">
      <h2>{t('tenderFeed', locale)}</h2>
      <ul className="feed">
        {tenders.map((tender) => (
          <li key={tender.id} className="feed-row">
            <a className="feed-title" href={`/tenders/${tender.id}`}>
              {tender.title}
            </a>
            <span className={`badge badge-${tender.status}`}>
              {tender.status}
            </span>
            <span className="muted">{tender.source}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
