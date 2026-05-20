import type { JSX } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ApiError,
  loadCurrentUser,
  tenderApi,
  type ClientCompany,
  type ClientDocument,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type StringKey } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { DocumentRowActions } from '../document-row-actions';
import { DownloadLink } from './download-link';

export const dynamic = 'force-dynamic';

interface EvidenceRow {
  id: string;
  complianceItemId: string;
  documentId: string;
  note: string | null;
  createdAt: string;
}

async function loadDoc(id: string): Promise<ClientDocument | null> {
  try {
    return await tenderApi.getDocument(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function safeEvidence(id: string): Promise<EvidenceRow[]> {
  try {
    return await tenderApi.listDocumentEvidence(id);
  } catch {
    return [];
  }
}

async function safeClients(): Promise<ClientCompany[]> {
  try {
    return await tenderApi.listClients();
  } catch {
    return [];
  }
}

const STATE_LABEL: Record<string, StringKey> = {
  active: 'stateActive',
  expiring: 'stateExpiring',
  restricted: 'stateRestricted',
  archived: 'stateArchived',
};
const SENSITIVITY_LABEL: Record<string, StringKey> = {
  low: 'sensitivityLow',
  medium: 'sensitivityMedium',
  high: 'sensitivityHigh',
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const [doc, user, locale, evidence, clients] = await Promise.all([
    loadDoc(id),
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    safeEvidence(id),
    safeClients(),
  ]);
  if (!doc) {
    notFound();
  }
  const clientName =
    clients.find((c) => c.id === doc.clientCompanyId)?.name ??
    doc.clientCompanyId;
  const stateKey = STATE_LABEL[doc.state] ?? 'stateActive';
  const sensKey =
    SENSITIVITY_LABEL[doc.sensitivity] ?? 'sensitivityLow';

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/documents" className="muted breadcrumb">
        ← {t('documentsTitle', locale)}
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1>{doc.filename}</h1>
          <div className="meta-row">
            <span>
              {t('status', locale)}:{' '}
              <span className={`chip chip-${doc.state}`}>
                {t(stateKey, locale)}
              </span>
            </span>
            <span>
              {t('sensitivity', locale)}:{' '}
              <span className={`chip chip-sens-${doc.sensitivity}`}>
                {t(sensKey, locale)}
              </span>
            </span>
            <span className="muted mono">{doc.id.slice(0, 8)}…</span>
          </div>
        </div>
        <div className="sweep-cluster">
          {doc.storageKey && (
            <DownloadLink documentId={doc.id} locale={locale} />
          )}
          <DocumentRowActions doc={doc} locale={locale} />
        </div>
      </header>

      <section className="panel">
        <h2>{locale === 'ar' ? 'البيانات' : 'Metadata'}</h2>
        <ul className="kvs">
          <li>
            <span className="muted">{t('client', locale)}</span>
            <strong>{clientName}</strong>
          </li>
          <li>
            <span className="muted">{t('documentType', locale)}</span>
            <span className="chip">{doc.documentType}</span>
          </li>
          <li>
            <span className="muted">{t('expiresAt', locale)}</span>
            <span>
              {doc.expiresAt
                ? new Date(doc.expiresAt).toLocaleDateString()
                : '—'}
            </span>
          </li>
          <li>
            <span className="muted">{t('auditTimestamp', locale)}</span>
            <span className="muted">
              {new Date(doc.createdAt).toLocaleString()}
            </span>
          </li>
          {doc.storageKey && (
            <>
              <li>
                <span className="muted">contentType</span>
                <span className="mono">{doc.contentType ?? '—'}</span>
              </li>
              <li>
                <span className="muted">sizeBytes</span>
                <span className="mono">
                  {typeof doc.sizeBytes === 'number'
                    ? doc.sizeBytes < 1024
                      ? `${doc.sizeBytes} B`
                      : doc.sizeBytes < 1024 * 1024
                        ? `${Math.round(doc.sizeBytes / 1024)} KB`
                        : `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                    : '—'}
                </span>
              </li>
            </>
          )}
        </ul>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>
            {locale === 'ar' ? 'الاستخدام في المصفوفات' : 'Used as evidence in'}
          </h2>
          <span className="muted small">{evidence.length}</span>
        </header>
        {evidence.length === 0 ? (
          <p className="muted">
            {locale === 'ar'
              ? 'لم تُستخدم هذه الوثيقة في أي بند امتثال بعد.'
              : 'Not used as evidence in any compliance item yet.'}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">complianceItemId</th>
                <th scope="col">{t('notes', locale)}</th>
                <th scope="col">{t('auditTimestamp', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((link) => (
                <tr key={link.id}>
                  <td className="mono">
                    {link.complianceItemId.slice(0, 8)}…
                  </td>
                  <td className="muted">{link.note ?? '—'}</td>
                  <td className="muted">
                    {new Date(link.createdAt).toLocaleString()}
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
