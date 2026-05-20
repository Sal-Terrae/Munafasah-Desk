'use client';

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type JSX,
} from 'react';
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

export function DocumentUploadForm({
  locale,
  clients,
}: {
  locale: Locale;
  clients: ClientCompany[];
}): JSX.Element {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [clientCompanyId, setClientCompanyId] = useState(clients[0]?.id ?? '');
  const [documentType, setDocumentType] = useState<(typeof TYPES)[number]>('other');
  const [sensitivity, setSensitivity] = useState<DocumentSensitivity>('low');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>): void {
    const next = e.target.files?.[0] ?? null;
    setFile(next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!file) {
      setError(
        locale === 'ar' ? 'الرجاء اختيار ملف' : 'Please choose a file',
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await tenderApi.uploadDocument({
        file,
        clientCompanyId,
        documentType,
        sensitivity,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setFile(null);
      setExpiresAt('');
      // Reset the file input by re-keying the form element via state.
      const form = e.currentTarget;
      form.reset();
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
      <label htmlFor="upload-file">
        {locale === 'ar' ? 'الملف' : 'File'}
      </label>
      <input
        id="upload-file"
        type="file"
        required
        onChange={onFile}
      />

      <label htmlFor="upload-client">{t('client', locale)}</label>
      <select
        id="upload-client"
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

      <label htmlFor="upload-type">{t('documentType', locale)}</label>
      <select
        id="upload-type"
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

      <label htmlFor="upload-sens">{t('sensitivity', locale)}</label>
      <select
        id="upload-sens"
        value={sensitivity}
        onChange={(e) => setSensitivity(e.target.value as DocumentSensitivity)}
      >
        {SENSITIVITIES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label htmlFor="upload-expires">{t('expiresAt', locale)}</label>
      <input
        id="upload-expires"
        type="date"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
      />

      {file && (
        <p className="muted small">
          {file.name} ·{' '}
          {file.size < 1024
            ? `${file.size} B`
            : file.size < 1024 * 1024
              ? `${Math.round(file.size / 1024)} KB`
              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
        </p>
      )}

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !file || !clientCompanyId}
        aria-busy={busy}
      >
        {busy
          ? locale === 'ar'
            ? 'جارٍ الرفع...'
            : 'Uploading…'
          : locale === 'ar'
            ? 'رفع'
            : 'Upload'}
      </button>
    </form>
  );
}
