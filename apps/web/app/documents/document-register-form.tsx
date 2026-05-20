'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type ClientCompany,
  type DocumentSensitivity,
} from '../../lib/api';
import { t, type Locale } from '../../lib/i18n';

const TYPES = ['legal', 'financial', 'technical', 'admin', 'other'] as const;
const SENSITIVITIES: DocumentSensitivity[] = ['low', 'medium', 'high'];

export function DocumentRegisterForm({
  locale,
  clients,
}: {
  locale: Locale;
  clients: ClientCompany[];
}): JSX.Element {
  const router = useRouter();
  const [filename, setFilename] = useState('');
  const [clientCompanyId, setClientCompanyId] = useState(clients[0]?.id ?? '');
  const [documentType, setDocumentType] = useState<(typeof TYPES)[number]>('other');
  const [sensitivity, setSensitivity] = useState<DocumentSensitivity>('low');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await tenderApi.registerDocument({
        filename: filename.trim(),
        clientCompanyId,
        documentType,
        sensitivity,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setFilename('');
      setExpiresAt('');
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
      <label htmlFor="doc-filename">{t('filename', locale)}</label>
      <input
        id="doc-filename"
        type="text"
        required
        maxLength={300}
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
      />

      <label htmlFor="doc-client">{t('client', locale)}</label>
      <select
        id="doc-client"
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

      <label htmlFor="doc-type">{t('documentType', locale)}</label>
      <select
        id="doc-type"
        value={documentType}
        onChange={(e) =>
          setDocumentType(e.target.value as (typeof TYPES)[number])
        }
      >
        {TYPES.map((tp) => (
          <option key={tp} value={tp}>
            {tp}
          </option>
        ))}
      </select>

      <label htmlFor="doc-sens">{t('sensitivity', locale)}</label>
      <select
        id="doc-sens"
        value={sensitivity}
        onChange={(e) => setSensitivity(e.target.value as DocumentSensitivity)}
      >
        {SENSITIVITIES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label htmlFor="doc-expires">{t('expiresAt', locale)}</label>
      <input
        id="doc-expires"
        type="date"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
      />

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !filename.trim() || !clientCompanyId}
        aria-busy={busy}
      >
        {busy ? t('saving', locale) : t('save', locale)}
      </button>
    </form>
  );
}
