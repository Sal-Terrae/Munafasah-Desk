import { type Locale, t } from '../lib/i18n';
import type { DocumentSummary } from '../lib/api';

export function ExpiryRadar({
  docs,
  locale,
}: {
  docs: DocumentSummary[];
  locale: Locale;
}): JSX.Element {
  return (
    <section className="panel">
      <h2>{t('expiryRadar', locale)}</h2>
      <ul className="expiry-list">
        {docs.map((doc) => (
          <li key={doc.id} className={`expiry expiry-${doc.state}`}>
            <span className="expiry-name">{doc.filename}</span>
            <span className="muted">{doc.documentType}</span>
            {doc.expiresAt && (
              <span className="expiry-date">{doc.expiresAt}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
