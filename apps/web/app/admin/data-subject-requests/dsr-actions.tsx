'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  ApiError,
  type DataSubjectRequest,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function DsrActions({
  row,
  locale,
}: {
  row: DataSubjectRequest;
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(op: 'approve' | 'deny' | 'execute'): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (op === 'approve') await adminApi.approveDataSubjectRequest(row.id);
      else if (op === 'deny') await adminApi.denyDataSubjectRequest(row.id);
      else await adminApi.executeDataSubjectRequest(row.id);
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

  return (
    <div className="row-actions">
      {row.status === 'pending' && (
        <>
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
        </>
      )}
      {row.status === 'approved' && (
        <button
          type="button"
          className="btn-sm btn-primary"
          disabled={busy}
          onClick={() => run('execute')}
        >
          {t('execute', locale)}
        </button>
      )}
      {error && (
        <span role="alert" className="row-error">
          {error}
        </span>
      )}
    </div>
  );
}
