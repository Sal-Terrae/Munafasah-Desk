import type { JSX } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ApiError,
  loadCurrentUser,
  tenderApi,
  type ComplianceMatrixRow,
  type Tender,
  type TenderAccess,
  type TenderRequirement,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t, type StringKey } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { TenderStatusControl } from './tender-status-control';
import { RequirementsSection } from './requirements-section';
import { MatricesSection } from './matrices-section';
import { AccessSection } from './access-section';

export const dynamic = 'force-dynamic';

async function loadTender(id: string): Promise<Tender | null> {
  try {
    return await tenderApi.getTender(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function safeListReqs(tenderId: string): Promise<TenderRequirement[]> {
  try {
    return await tenderApi.listRequirements(tenderId);
  } catch {
    return [];
  }
}

async function safeListMatrices(
  tenderId: string,
): Promise<ComplianceMatrixRow[]> {
  try {
    return await tenderApi.listMatrices(tenderId);
  } catch {
    return [];
  }
}

async function safeListAccess(tenderId: string): Promise<TenderAccess[]> {
  try {
    return await tenderApi.listAccess(tenderId);
  } catch {
    return [];
  }
}

export default async function TenderWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  const [tender, user, locale] = await Promise.all([
    loadTender(id),
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  if (!tender) {
    notFound();
  }
  const [requirements, matrices, access] = await Promise.all([
    safeListReqs(tender.id),
    safeListMatrices(tender.id),
    safeListAccess(tender.id),
  ]);

  const statusChip: StringKey =
    tender.status === 'intake'
      ? 'statusIntake'
      : tender.status === 'review'
        ? 'statusReview'
        : tender.status === 'ready'
          ? 'statusReady'
          : tender.status === 'submitted'
            ? 'statusSubmitted'
            : 'statusIntake';

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/tenders" className="muted breadcrumb">
        ← {t('tendersTitle', locale)}
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1>{tender.title}</h1>
          <div className="meta-row">
            <span>
              {t('status', locale)}:{' '}
              <span className={`chip chip-${tender.status}`}>
                {t(statusChip, locale)}
              </span>
            </span>
            <span className="muted">
              {t('sourceLabel', locale)}: {tender.source}
            </span>
            <span className="muted mono">{tender.id.slice(0, 8)}…</span>
          </div>
        </div>
        <TenderStatusControl tender={tender} locale={locale} />
      </header>

      <RequirementsSection
        tenderId={tender.id}
        initial={requirements}
        locale={locale}
      />
      <MatricesSection
        tenderId={tender.id}
        initial={matrices}
        locale={locale}
      />
      <AccessSection
        tenderId={tender.id}
        initial={access}
        locale={locale}
      />
    </AppShell>
  );
}
