import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  loadCurrentUser,
  tenderApi,
  type ClientCompany,
  type ClientDocument,
  type DocumentSensitivity,
  type DocumentState,
} from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t, type Locale, type StringKey } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';
import { DocumentRegisterForm } from './document-register-form';
import { DocumentRowActions } from './document-row-actions';

export const dynamic = 'force-dynamic';

const STATE_FILTERS: { value: DocumentState | ''; labelKey: StringKey }[] = [
  { value: '', labelKey: 'filterAll' },
  { value: 'active', labelKey: 'stateActive' },
  { value: 'expiring', labelKey: 'stateExpiring' },
  { value: 'restricted', labelKey: 'stateRestricted' },
  { value: 'archived', labelKey: 'stateArchived' },
];

const SENSITIVITY_FILTERS: { value: DocumentSensitivity | ''; labelKey: StringKey }[] = [
  { value: '', labelKey: 'filterAll' },
  { value: 'low', labelKey: 'sensitivityLow' },
  { value: 'medium', labelKey: 'sensitivityMedium' },
  { value: 'high', labelKey: 'sensitivityHigh' },
];

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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    sensitivity?: string;
    type?: string;
  }>;
}): Promise<JSX.Element> {
  const [user, locale, sp] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
    searchParams,
  ]);

  let docs: ClientDocument[] = [];
  let clients: ClientCompany[] = [];
  let loadError = false;
  try {
    [docs, clients] = await Promise.all([
      tenderApi.listDocuments(),
      tenderApi.listClients(),
    ]);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) loadError = true;
  }

  const stateFilter = STATE_FILTERS.some((f) => f.value === sp.state)
    ? (sp.state as DocumentState)
    : undefined;
  const sensitivityFilter = SENSITIVITY_FILTERS.some(
    (f) => f.value === sp.sensitivity,
  )
    ? (sp.sensitivity as DocumentSensitivity)
    : undefined;
  const typeFilter = sp.type?.trim() || undefined;

  const filtered = docs.filter(
    (d) =>
      (!stateFilter || d.state === stateFilter) &&
      (!sensitivityFilter || d.sensitivity === sensitivityFilter) &&
      (!typeFilter || d.documentType === typeFilter),
  );

  const knownTypes = Array.from(new Set(docs.map((d) => d.documentType))).sort();

  const clientName = (id: string): string =>
    clients.find((c) => c.id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('documentsTitle', locale)}</h1>
        <p className="muted">{t('documentsLead', locale)}</p>
      </header>

      <section className="panel">
        <h2>{t('registerDocument', locale)}</h2>
        {clients.length === 0 ? (
          <p className="muted">
            {t('noClientsYet', locale)}{' '}
            <Link href="/clients">/clients</Link>
          </p>
        ) : (
          <DocumentRegisterForm locale={locale} clients={clients} />
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>{t('documentsTitle', locale)}</h2>
          <div className="filter-cluster">
            <FilterRow
              current={stateFilter}
              options={STATE_FILTERS}
              param="state"
              extra={{
                ...(sensitivityFilter ? { sensitivity: sensitivityFilter } : {}),
                ...(typeFilter ? { type: typeFilter } : {}),
              }}
              locale={locale}
            />
            <FilterRow
              current={sensitivityFilter}
              options={SENSITIVITY_FILTERS}
              param="sensitivity"
              extra={{
                ...(stateFilter ? { state: stateFilter } : {}),
                ...(typeFilter ? { type: typeFilter } : {}),
              }}
              locale={locale}
            />
            {knownTypes.length > 0 && (
              <TypeFilterRow
                current={typeFilter}
                options={knownTypes}
                extra={{
                  ...(stateFilter ? { state: stateFilter } : {}),
                  ...(sensitivityFilter
                    ? { sensitivity: sensitivityFilter }
                    : {}),
                }}
                locale={locale}
              />
            )}
          </div>
        </header>

        {loadError && (
          <p role="alert" className="form-error">
            {t('loadFailed', locale)}
          </p>
        )}

        {docs.length === 0 ? (
          <p className="muted">{t('noDocumentsYet', locale)}</p>
        ) : filtered.length === 0 ? (
          <p className="muted">{t('noResults', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('filename', locale)}</th>
                <th scope="col">{t('client', locale)}</th>
                <th scope="col">{t('documentType', locale)}</th>
                <th scope="col">{t('sensitivity', locale)}</th>
                <th scope="col">{t('status', locale)}</th>
                <th scope="col">{t('expiresAt', locale)}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const stateKey =
                  STATE_LABEL[doc.state] ?? 'stateActive';
                const sensKey =
                  SENSITIVITY_LABEL[doc.sensitivity] ?? 'sensitivityLow';
                return (
                  <tr key={doc.id}>
                    <td>{doc.filename}</td>
                    <td className="muted">{clientName(doc.clientCompanyId)}</td>
                    <td>
                      <span className="chip">{doc.documentType}</span>
                    </td>
                    <td>
                      <span className={`chip chip-sens-${doc.sensitivity}`}>
                        {t(sensKey, locale)}
                      </span>
                    </td>
                    <td>
                      <span className={`chip chip-${doc.state}`}>
                        {t(stateKey, locale)}
                      </span>
                    </td>
                    <td className="muted">
                      {doc.expiresAt
                        ? new Date(doc.expiresAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <DocumentRowActions
                        doc={doc}
                        locale={locale}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}

function FilterRow<V extends string>({
  current,
  options,
  param,
  extra,
  locale,
}: {
  current: V | undefined;
  options: { value: V | ''; labelKey: StringKey }[];
  param: string;
  extra: Record<string, string>;
  locale: Locale;
}) {
  function hrefFor(value: string): string {
    const sp = new URLSearchParams({ ...extra });
    if (value) sp.set(param, value);
    const qs = sp.toString();
    return qs ? `/documents?${qs}` : '/documents';
  }
  return (
    <div className="filter-row">
      {options.map((o) => (
        <Link
          key={o.value || 'all'}
          href={hrefFor(o.value)}
          className={`chip ${current === o.value || (!current && !o.value) ? 'chip-active' : ''}`}
        >
          {t(o.labelKey, locale)}
        </Link>
      ))}
    </div>
  );
}

function TypeFilterRow({
  current,
  options,
  extra,
  locale,
}: {
  current: string | undefined;
  options: string[];
  extra: Record<string, string>;
  locale: Locale;
}) {
  function hrefFor(value: string): string {
    const sp = new URLSearchParams({ ...extra });
    if (value) sp.set('type', value);
    const qs = sp.toString();
    return qs ? `/documents?${qs}` : '/documents';
  }
  return (
    <div className="filter-row">
      <Link
        href={hrefFor('')}
        className={`chip ${!current ? 'chip-active' : ''}`}
      >
        {t('filterAll', locale)}
      </Link>
      {options.map((value) => (
        <Link
          key={value}
          href={hrefFor(value)}
          className={`chip ${current === value ? 'chip-active' : ''}`}
        >
          {value}
        </Link>
      ))}
    </div>
  );
}
