'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { t, type Locale } from '../../lib/i18n';

export function SettingsSignOut({ locale }: { locale: Locale }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  let logout: () => Promise<void> = async () => undefined;
  try {
    const auth = useAuth();
    logout = auth.logout;
  } catch {
    // not inside the provider; the button stays no-op
  }

  async function onClick(): Promise<void> {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className="btn btn-danger"
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy ? t('saving', locale) : t('signOut', locale)}
    </button>
  );
}
