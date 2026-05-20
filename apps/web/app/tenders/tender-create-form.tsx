'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type ClientCompany,
} from '../../lib/api';
import { t, type Locale } from '../../lib/i18n';

export function TenderCreateForm({
  locale,
  clients,
}: {
  locale: Locale;
  clients: ClientCompany[];
}): JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [clientCompanyId, setClientCompanyId] = useState(
    clients[0]?.id ?? '',
  );
  const [source, setSource] = useState('manual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await tenderApi.createTender({
        title: title.trim(),
        clientCompanyId,
        source,
      });
      router.push(`/tenders/${created.id}`);
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
      <label htmlFor="tender-title">{t('tenderTitleLabel', locale)}</label>
      <input
        id="tender-title"
        type="text"
        required
        maxLength={300}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="tender-client">{t('client', locale)}</label>
      <select
        id="tender-client"
        required
        value={clientCompanyId}
        onChange={(e) => setClientCompanyId(e.target.value)}
      >
        <option value="" disabled>
          {t('selectClient', locale)}
        </option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label htmlFor="tender-source">{t('sourceLabel', locale)}</label>
      <select
        id="tender-source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      >
        <option value="manual">manual</option>
        <option value="etimad">etimad</option>
        <option value="email">email</option>
        <option value="link">link</option>
      </select>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !title.trim() || !clientCompanyId}
        aria-busy={busy}
      >
        {busy ? t('saving', locale) : t('save', locale)}
      </button>
    </form>
  );
}
