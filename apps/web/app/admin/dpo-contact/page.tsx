import type { JSX } from 'react';
import Link from 'next/link';
import {
  ApiError,
  adminApi,
  loadCurrentUser,
  type DpoContact,
} from '../../../lib/api';
import { resolveServerLocale } from '../../../lib/locale';
import { t } from '../../../lib/i18n';
import { AppShell } from '../../../components/AppShell';
import { DpoContactForm } from './dpo-contact-form';

export const dynamic = 'force-dynamic';

export default async function DpoContactPage(): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);

  let initial: DpoContact | null = null;
  let loadError: 'forbidden' | 'fail' | null = null;
  try {
    initial = await adminApi.getDpoContact();
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) loadError = 'forbidden';
    else loadError = 'fail';
  }

  return (
    <AppShell locale={locale} user={user}>
      <Link href="/admin" className="muted breadcrumb">
        {t('backToAdmin', locale)}
      </Link>
      <header className="page-header">
        <h1>{t('adminCardDpo', locale)}</h1>
        <p className="muted">{t('adminCardDpoDesc', locale)}</p>
      </header>
      {loadError === 'fail' && (
        <p role="alert" className="form-error">
          {t('loadFailed', locale)}
        </p>
      )}
      <DpoContactForm initial={initial} locale={locale} />
    </AppShell>
  );
}
