import type { JSX } from 'react';
import Link from 'next/link';
import { loadCurrentUser } from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { ConsentTool } from './consent-tool';

export const dynamic = 'force-dynamic';

export default async function ConsentPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  return (
    <AppShell locale={locale} user={user}>
      <Link href="/admin" className="muted breadcrumb">
        {t('backToAdmin', locale)}
      </Link>
      <header className="page-header">
        <h1>{t('adminCardConsent', locale)}</h1>
        <p className="muted">{t('adminCardConsentDesc', locale)}</p>
      </header>
      <ConsentTool locale={locale} />
    </AppShell>
  );
}
