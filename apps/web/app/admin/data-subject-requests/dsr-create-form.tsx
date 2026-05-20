'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  ApiError,
  type DataSubjectRequestType,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

const TYPES: DataSubjectRequestType[] = ['access', 'erasure', 'rectification'];

export function DsrCreateForm({ locale }: { locale: Locale }): JSX.Element {
  const router = useRouter();
  const [type, setType] = useState<DataSubjectRequestType>('access');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.createDataSubjectRequest({
        type,
        subjectEmail: email,
        notes: notes || undefined,
      });
      setEmail('');
      setNotes('');
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
      <label htmlFor="dsr-email">{t('subjectEmail', locale)}</label>
      <input
        id="dsr-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="dsr-type">{t('requestType', locale)}</label>
      <select
        id="dsr-type"
        value={type}
        onChange={(e) => setType(e.target.value as DataSubjectRequestType)}
      >
        {TYPES.map((tp) => (
          <option key={tp} value={tp}>
            {t(
              tp === 'access'
                ? 'dsrAccess'
                : tp === 'erasure'
                  ? 'dsrErasure'
                  : 'dsrRectification',
              locale,
            )}
          </option>
        ))}
      </select>

      <label htmlFor="dsr-notes">{t('notes', locale)}</label>
      <input
        id="dsr-notes"
        type="text"
        maxLength={2000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? t('saving', locale) : t('save', locale)}
      </button>
    </form>
  );
}
