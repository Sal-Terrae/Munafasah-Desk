'use client';

import { useState, type JSX } from 'react';
import { tenderApi, ApiError } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function DownloadLink({
  documentId,
  locale,
}: {
  documentId: string;
  locale: Locale;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const { url } = await tenderApi.documentDownloadUrl(documentId);
      // Open in a new tab — the presigned URL is short-lived.
      window.open(url, '_blank', 'noopener,noreferrer');
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
    <>
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={() => void onClick()}
      >
        {busy
          ? t('saving', locale)
          : locale === 'ar'
            ? 'تنزيل'
            : 'Download'}
      </button>
      {error && (
        <p role="alert" className="form-error small">
          {error}
        </p>
      )}
    </>
  );
}
