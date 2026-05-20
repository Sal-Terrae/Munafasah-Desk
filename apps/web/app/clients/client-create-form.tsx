'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { tenderApi, ApiError } from '../../lib/api';
import { t, type Locale } from '../../lib/i18n';

export function ClientCreateForm({ locale }: { locale: Locale }): JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await tenderApi.createClient(name.trim());
      setName('');
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? ((err.body as { message?: string } | null)?.message ?? 'Failed')
          : 'Failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form-inline" onSubmit={onSubmit} noValidate>
      <label htmlFor="client-name">{t('clientName', locale)}</label>
      <input
        id="client-name"
        type="text"
        required
        maxLength={200}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !name.trim()} aria-busy={busy}>
        {busy ? t('saving', locale) : t('save', locale)}
      </button>
    </form>
  );
}
