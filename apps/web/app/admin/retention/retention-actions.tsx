'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  ApiError,
  type RetentionAction,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function RetentionRowActions({
  row,
  locale,
}: {
  row: RetentionAction;
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(op: 'approve' | 'deny'): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (op === 'approve') await adminApi.approveRetention(row.id);
      else await adminApi.denyRetention(row.id);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('accessDenied', locale));
      } else if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setError(body?.message ?? 'Failed');
      } else {
        setError('Failed');
      }
    } finally {
      setBusy(false);
    }
  }

  if (row.status !== 'pending') {
    return <span className="muted small">—</span>;
  }
  return (
    <div className="row-actions">
      <button
        type="button"
        className="btn-sm"
        disabled={busy}
        onClick={() => run('approve')}
      >
        {t('approve', locale)}
      </button>
      <button
        type="button"
        className="btn-sm btn-danger"
        disabled={busy}
        onClick={() => run('deny')}
      >
        {t('deny', locale)}
      </button>
      {error && (
        <span role="alert" className="row-error">
          {error}
        </span>
      )}
    </div>
  );
}
