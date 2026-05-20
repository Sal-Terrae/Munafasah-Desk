import type { JSX } from 'react';
import { notFound } from 'next/navigation';
import {
  apiFetch,
  ApiError,
  loadCurrentUser,
  type Tender,
} from '../../../lib/api';
import { t } from '../../../lib/i18n';
import { resolveServerLocale } from '../../../lib/locale';
import { AppShell } from '../../../components/AppShell';

export const dynamic = 'force-dynamic';

async function loadTender(id: string): Promise<Tender | null> {
  try {
    return await apiFetch<Tender>(`/tenders/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
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
  return (
    <AppShell locale={locale} user={user}>
      <a href="/" className="muted breadcrumb">
        ← {t('dashboard', locale)}
      </a>
      <h1>{tender.title}</h1>
      <div className="meta-row">
        <span>
          {t('status', locale)}: {tender.status}
        </span>
        <span className="muted">source: {tender.source}</span>
      </div>
      <section className="panel">
        <h2>{t('taskRail', locale)}</h2>
        <p className="muted">
          Compliance matrix + vault wired in P10/P11 (persistence + audit).
          UI table follows in P12b.
        </p>
      </section>
    </AppShell>
  );
}
