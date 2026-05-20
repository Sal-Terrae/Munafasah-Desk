import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  loadCurrentUser,
  tenderApi,
  type ComplianceMatrixRow,
  type Tender,
} from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';

export const dynamic = 'force-dynamic';

interface TenderWithMatrices {
  tender: Tender;
  matrices: ComplianceMatrixRow[];
}

async function safeList(tenderId: string): Promise<ComplianceMatrixRow[]> {
  try {
    return await tenderApi.listMatrices(tenderId);
  } catch {
    return [];
  }
}

export default async function CompliancePage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);

  let tenders: Tender[] = [];
  let loadError = false;
  try {
    tenders = await tenderApi.listTenders();
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) loadError = true;
  }

  const rows: TenderWithMatrices[] = await Promise.all(
    tenders.map(async (tender) => ({
      tender,
      matrices: await safeList(tender.id),
    })),
  );

  const totalMatrices = rows.reduce((n, r) => n + r.matrices.length, 0);
  const tendersWithMatrix = rows.filter((r) => r.matrices.length > 0).length;
  const coverage =
    tenders.length === 0 ? 0 : Math.round((tendersWithMatrix / tenders.length) * 100);

  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('complianceTitle', locale)}</h1>
        <p className="muted">{t('complianceLead', locale)}</p>
      </header>

      <section className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-label">{t('tendersTitle', locale)}</div>
          <div className="kpi-value">{tenders.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('matricesTitle', locale)}</div>
          <div className="kpi-value">{totalMatrices}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            {locale === 'ar' ? 'تغطية المصفوفات' : 'Matrix coverage'}
          </div>
          <div className="kpi-value">{coverage}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            {locale === 'ar' ? 'عطاءات بدون مصفوفة' : 'Tenders w/o matrix'}
          </div>
          <div className="kpi-value">{tenders.length - tendersWithMatrix}</div>
        </div>
      </section>

      <section className="panel">
        <h2>{t('tendersTitle', locale)}</h2>
        {loadError && (
          <p role="alert" className="form-error">
            {t('loadFailed', locale)}
          </p>
        )}
        {rows.length === 0 ? (
          <p className="muted">{t('noTendersYet', locale)}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('tenderTitleLabel', locale)}</th>
                <th scope="col">{t('status', locale)}</th>
                <th scope="col">{t('latestVersion', locale)}</th>
                <th scope="col">{t('matrixCount', locale)}</th>
                <th scope="col">{t('generatedAt', locale)}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tender, matrices }) => {
                const latest = matrices[0]; // listMatrices returns desc-by-version
                return (
                  <tr key={tender.id}>
                    <td>
                      <Link
                        href={`/tenders/${tender.id}`}
                        className="feed-title"
                      >
                        {tender.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`chip chip-${tender.status}`}>
                        {tender.status}
                      </span>
                    </td>
                    <td className="mono">
                      {latest ? `v${latest.version}` : '—'}
                    </td>
                    <td className="muted">{matrices.length}</td>
                    <td className="muted">
                      {latest
                        ? new Date(latest.generatedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      {latest ? (
                        <Link
                          href={`/tenders/${tender.id}`}
                          className="btn-sm"
                        >
                          {t('open', locale)} →
                        </Link>
                      ) : (
                        <Link
                          href={`/tenders/${tender.id}`}
                          className="btn-sm"
                        >
                          {t('generateNew', locale)} →
                        </Link>
                      )}
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
