import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  loadCurrentUser,
  tenderApi,
  type ClientCompany,
  type Tender,
} from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';
import { TenderCreateForm } from './tender-create-form';

export const dynamic = 'force-dynamic';

export default async function TendersPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  let tenders: Tender[] = [];
  let clients: ClientCompany[] = [];
  let loadError = false;
  try {
    [tenders, clients] = await Promise.all([
      tenderApi.listTenders(),
      tenderApi.listClients(),
    ]);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) loadError = true;
  }

  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('tendersTitle', locale)}</h1>
        <p className="muted">{t('tendersLead', locale)}</p>
      </header>

      <section className="panel">
        <h2>{t('newTender', locale)}</h2>
        {clients.length === 0 ? (
          <p className="muted">
            {t('noClientsYet', locale)}{' '}
            <Link href="/clients">/clients</Link>
          </p>
        ) : (
          <TenderCreateForm locale={locale} clients={clients} />
        )}
      </section>

      <section className="panel">
        <h2>{t('tendersTitle', locale)}</h2>
        {loadError && (
          <p role="alert" className="form-error">
            {t('loadFailed', locale)}
          </p>
        )}
        {tenders.length === 0 ? (
          <p className="muted">{t('noTendersYet', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('tenderTitleLabel', locale)}</th>
                <th scope="col">{t('status', locale)}</th>
                <th scope="col">{t('sourceLabel', locale)}</th>
                <th scope="col">{t('client', locale)}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {tenders.map((tender) => (
                <tr key={tender.id}>
                  <td>
                    <Link href={`/tenders/${tender.id}`} className="feed-title">
                      {tender.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`chip chip-${tender.status}`}>
                      {tender.status}
                    </span>
                  </td>
                  <td className="muted">{tender.source}</td>
                  <td className="mono muted">
                    {tender.clientCompanyId.slice(0, 8)}…
                  </td>
                  <td>
                    <Link
                      href={`/tenders/${tender.id}`}
                      className="btn-sm"
                    >
                      {t('open', locale)} →
                    </Link>
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
