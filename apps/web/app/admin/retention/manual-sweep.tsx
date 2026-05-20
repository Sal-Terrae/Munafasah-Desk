'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, ApiError } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function ManualSweepButton({ locale }: { locale: Locale }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const r = await adminApi.manualSweep();
      setLast(
        locale === 'ar'
          ? `${r.created} إضافة من ${r.docsScanned} وثيقة`
          : `${r.created} created, ${r.docsScanned} scanned`,
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('accessDenied', locale));
      } else {
        setError('Failed');
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sweep-cluster">
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={onClick}
      >
        {busy ? t('saving', locale) : t('manualSweep', locale)}
      </button>
      {last && <span className="muted small">{last}</span>}
      {error && (
        <span role="alert" className="form-error small">
          {error}
        </span>
      )}
    </div>
  );
}
