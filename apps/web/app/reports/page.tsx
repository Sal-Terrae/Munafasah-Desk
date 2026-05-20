import type { JSX } from 'react';
import {
  ApiError,
  apiFetch,
  loadCurrentUser,
  tenderApi,
  type ClientDocument,
  type Tender,
} from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t, type Locale, type StringKey } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  timestamp: string;
}

async function safeListTenders(): Promise<Tender[]> {
  try {
    return await tenderApi.listTenders();
  } catch {
    return [];
  }
}
async function safeListDocs(): Promise<ClientDocument[]> {
  try {
    return await tenderApi.listDocuments();
  } catch {
    return [];
  }
}
async function safeListAudit(): Promise<{ rows: AuditRow[]; forbidden: boolean }> {
  try {
    const rows = await apiFetch<AuditRow[]>('/audit-events?limit=100');
    return { rows, forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return { rows: [], forbidden: true };
    }
    return { rows: [], forbidden: false };
  }
}

function daysUntil(iso: string, now: Date): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

const STATUS_LABEL: Record<string, StringKey> = {
  intake: 'statusIntake',
  review: 'statusReview',
  ready: 'statusReady',
  submitted: 'statusSubmitted',
};
const DOC_STATE_LABEL: Record<string, StringKey> = {
  active: 'stateActive',
  expiring: 'stateExpiring',
  restricted: 'stateRestricted',
  archived: 'stateArchived',
};

export default async function ReportsPage(): Promise<JSX.Element> {
  const [user, locale, tenders, docs, audit] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    safeListTenders(),
    safeListDocs(),
    safeListAudit(),
  ]);

  const tenderStatus = tenders.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  const docStates = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.state] = (acc[d.state] ?? 0) + 1;
    return acc;
  }, {});

  const now = new Date();
  const next30 = docs.filter(
    (d) => d.expiresAt && daysUntil(d.expiresAt, now) <= 30 && d.state !== 'archived',
  ).length;
  const next60 = docs.filter(
    (d) => d.expiresAt && daysUntil(d.expiresAt, now) <= 60 && d.state !== 'archived',
  ).length;
  const next90 = docs.filter(
    (d) => d.expiresAt && daysUntil(d.expiresAt, now) <= 90 && d.state !== 'archived',
  ).length;

  const actionCounts = audit.rows.reduce<Record<string, number>>((acc, e) => {
    acc[e.action] = (acc[e.action] ?? 0) + 1;
    return acc;
  }, {});
  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('reportsTitle', locale)}</h1>
        <p className="muted">{t('reportsLead', locale)}</p>
      </header>

      <div className="grid-2">
        <section className="panel">
          <h2>{t('reportTenderStatus', locale)}</h2>
          <StatTable
            data={Object.entries(tenderStatus)}
            labelFor={(k) =>
              STATUS_LABEL[k] ? t(STATUS_LABEL[k], locale) : k
            }
            locale={locale}
            total={tenders.length}
          />
        </section>

        <section className="panel">
          <h2>{t('reportDocHealth', locale)}</h2>
          <StatTable
            data={Object.entries(docStates)}
            labelFor={(k) =>
              DOC_STATE_LABEL[k] ? t(DOC_STATE_LABEL[k], locale) : k
            }
            locale={locale}
            total={docs.length}
          />
          <hr className="hr-soft" />
          <h3 className="muted small">{t('expiryWindow', locale)}</h3>
          <ul className="kvs">
            <li>
              <span>{t('next30Days', locale)}</span>
              <strong>{next30}</strong>
            </li>
            <li>
              <span>{t('next60Days', locale)}</span>
              <strong>{next60}</strong>
            </li>
            <li>
              <span>{t('next90Days', locale)}</span>
              <strong>{next90}</strong>
            </li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>{t('reportAuditActivity', locale)}</h2>
        {audit.forbidden ? (
          <p className="muted">{t('accessDenied', locale)}</p>
        ) : topActions.length === 0 ? (
          <p className="muted">{t('noResults', locale)}</p>
        ) : (
          <>
            <p className="muted small">
              {t('total', locale)}: {audit.rows.length} ·{' '}
              {t('topActions', locale)}
            </p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('auditAction', locale)}</th>
                  <th scope="col">{t('count', locale)}</th>
                </tr>
              </thead>
              <tbody>
                {topActions.map(([action, count]) => (
                  <tr key={action}>
                    <td>
                      <span className="chip">{action}</span>
                    </td>
                    <td className="muted">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </AppShell>
  );
}

function StatTable({
  data,
  labelFor,
  locale,
  total,
}: {
  data: [string, number][];
  labelFor: (key: string) => string;
  locale: Locale;
  total: number;
}): JSX.Element {
  if (data.length === 0) {
    return <p className="muted">{t('noResults', locale)}</p>;
  }
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th scope="col">{t('status', locale)}</th>
          <th scope="col">{t('count', locale)}</th>
          <th scope="col">%</th>
        </tr>
      </thead>
      <tbody>
        {data
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => (
            <tr key={k}>
              <td>
                <span className={`chip chip-${k}`}>{labelFor(k)}</span>
              </td>
              <td>{n}</td>
              <td className="muted">
                {total ? Math.round((n / total) * 100) : 0}%
              </td>
            </tr>
          ))}
        <tr>
          <td className="muted">{t('total', locale)}</td>
          <td>
            <strong>{total}</strong>
          </td>
          <td className="muted">100%</td>
        </tr>
      </tbody>
    </table>
  );
}
