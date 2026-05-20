'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { tenderApi, ApiError, type Tender } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

const STATUSES = ['intake', 'review', 'ready', 'submitted'] as const;

export function TenderStatusControl({
  tender,
  locale,
}: {
  tender: Tender;
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: string): Promise<void> {
    if (next === tender.status) return;
    setBusy(true);
    setError(null);
    try {
      await tenderApi.setTenderStatus(tender.id, next);
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
    <div className="sweep-cluster">
      <label htmlFor="status-select" className="muted small">
        {t('changeStatus', locale)}
      </label>
      <select
        id="status-select"
        value={tender.status}
        disabled={busy}
        onChange={(e) => void setStatus(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="row-error">
          {error}
        </span>
      )}
    </div>
  );
}
