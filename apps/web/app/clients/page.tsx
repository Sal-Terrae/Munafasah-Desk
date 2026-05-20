import type { JSX } from 'react';
import {
  ApiError,
  loadCurrentUser,
  tenderApi,
  type ClientCompany,
} from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';
import { ClientCreateForm } from './client-create-form';

export const dynamic = 'force-dynamic';

export default async function ClientsPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  let clients: ClientCompany[] = [];
  let loadError = false;
  try {
    clients = await tenderApi.listClients();
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) loadError = true;
  }
  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('clientsTitle', locale)}</h1>
        <p className="muted">{t('clientsLead', locale)}</p>
      </header>

      <section className="panel">
        <h2>{t('newClient', locale)}</h2>
        <ClientCreateForm locale={locale} />
      </section>

      <section className="panel">
        <h2>{t('clientsTitle', locale)}</h2>
        {loadError && (
          <p role="alert" className="form-error">
            {t('loadFailed', locale)}
          </p>
        )}
        {clients.length === 0 ? (
          <p className="muted">{t('noClientsYet', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('clientName', locale)}</th>
                <th scope="col">id</th>
                <th scope="col">{t('auditTimestamp', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="mono muted">{c.id.slice(0, 8)}…</td>
                  <td className="muted">
                    {new Date(c.createdAt).toLocaleString()}
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
