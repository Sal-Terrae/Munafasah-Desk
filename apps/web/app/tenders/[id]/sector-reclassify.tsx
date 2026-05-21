'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, tenderApi } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function SectorReclassifyButton({
  tenderId,
  currentSector,
  currentCategory,
  currentConfidence,
  isOwner,
  locale,
}: {
  tenderId: string;
  currentSector: string | null;
  currentCategory: string | null;
  currentConfidence: number | null;
  isOwner: boolean;
  locale: Locale;
}): JSX.Element | null {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  async function run(): Promise<void> {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const r = await tenderApi.reclassifySector(tenderId, true);
      setResult(
        `${r.classification.sector} / ${r.classification.category} (conf ${r.classification.confidence.toFixed(2)})`,
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setError(
          `${t('sectorReclassifyFailed', locale)}: ${body?.message ?? err.status}`,
        );
      } else {
        setError(t('sectorReclassifyFailed', locale));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sector-reclassify">
      {currentSector && (
        <span className="muted small">
          {currentSector} · {currentCategory ?? '—'} ·{' '}
          {currentConfidence !== null
            ? `conf ${currentConfidence.toFixed(2)}`
            : 'conf —'}
        </span>
      )}
      <button
        type="button"
        className="btn-sm"
        disabled={busy}
        onClick={run}
      >
        {busy
          ? t('sectorReclassifyRunning', locale)
          : t('sectorReclassify', locale)}
      </button>
      {result && (
        <span role="status" className="small">
          {t('sectorReclassifyDone', locale)} {result}
        </span>
      )}
      {error && (
        <span role="alert" className="row-error">
          {error}
        </span>
      )}
    </div>
  );
}
