import type { JSX } from 'react';
import Link from 'next/link';
import { loadCurrentUser } from '../../lib/api';
import { resolveServerLocale } from '../../lib/locale';
import { t, type StringKey } from '../../lib/i18n';
import { AppShell } from '../../components/AppShell';

export const dynamic = 'force-dynamic';

interface AdminTile {
  href: string;
  titleKey: StringKey;
  descKey: StringKey;
}

const TILES: AdminTile[] = [
  {
    href: '/admin/dpo-contact',
    titleKey: 'adminCardDpo',
    descKey: 'adminCardDpoDesc',
  },
  {
    href: '/admin/data-subject-requests',
    titleKey: 'adminCardDsr',
    descKey: 'adminCardDsrDesc',
  },
  {
    href: '/admin/retention',
    titleKey: 'adminCardRetention',
    descKey: 'adminCardRetentionDesc',
  },
  {
    href: '/admin/consent',
    titleKey: 'adminCardConsent',
    descKey: 'adminCardConsentDesc',
  },
  {
    href: '/admin/ingestion',
    titleKey: 'adminCardIngestion',
    descKey: 'adminCardIngestionDesc',
  },
  {
    href: '/admin/audit',
    titleKey: 'adminCardAudit',
    descKey: 'adminCardAuditDesc',
  },
  {
    href: '/admin/training-register',
    titleKey: 'adminCardTraining',
    descKey: 'adminCardTrainingDesc',
  },
  {
    href: '/admin/ingestion-runs',
    titleKey: 'adminCardIngestionRuns',
    descKey: 'adminCardIngestionRunsDesc',
  },
];

export default async function AdminLanding(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  return (
    <AppShell locale={locale} user={user}>
      <header className="page-header">
        <h1>{t('adminTitle', locale)}</h1>
        <p className="muted">{t('adminLead', locale)}</p>
      </header>
      <div className="admin-grid">
        {TILES.map((tile) => (
          <Link key={tile.href} className="admin-tile" href={tile.href}>
            <h2>{t(tile.titleKey, locale)}</h2>
            <p>{t(tile.descKey, locale)}</p>
            <span className="muted small">{t('open', locale)} →</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
