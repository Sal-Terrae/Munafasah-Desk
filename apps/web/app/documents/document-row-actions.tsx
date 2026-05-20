'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type ClientDocument,
  type DocumentState,
} from '../../lib/api';
import { t, type Locale } from '../../lib/i18n';

// Cycle is: active → expiring → restricted → archived → active
const NEXT_STATE: Record<DocumentState, DocumentState> = {
  active: 'expiring',
  expiring: 'restricted',
  restricted: 'archived',
  archived: 'active',
};

const ALL_STATES: DocumentState[] = [
  'active',
  'expiring',
  'restricted',
  'archived',
];

export function DocumentRowActions({
  doc,
  locale,
}: {
  doc: ClientDocument;
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setState(next: DocumentState): Promise<void> {
    if (next === doc.state) return;
    setBusy(true);
    setError(null);
    try {
      await tenderApi.setDocumentState(doc.id, next);
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

  const next = NEXT_STATE[doc.state as DocumentState] ?? 'active';

  return (
    <div className="row-actions">
      <select
        aria-label={t('cycleState', locale)}
        value={doc.state}
        disabled={busy}
        onChange={(e) => void setState(e.target.value as DocumentState)}
        className="state-select"
      >
        {ALL_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-sm"
        disabled={busy}
        onClick={() => void setState(next)}
        title={`→ ${next}`}
      >
        → {next}
      </button>
      {error && (
        <span role="alert" className="row-error">
          {error}
        </span>
      )}
    </div>
  );
}
