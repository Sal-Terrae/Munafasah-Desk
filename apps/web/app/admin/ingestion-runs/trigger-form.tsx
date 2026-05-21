'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, adminApi } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function TriggerIngestionForm({
  locale,
}: {
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sourceCode, setSourceCode] = useState('etimad');
  const [maxPages, setMaxPages] = useState('1');
  const [maxItems, setMaxItems] = useState('5');
  const [syncToAdmin, setSyncToAdmin] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    setBusy(true);
    setSuccess(null);
    setError(null);
    try {
      const r = await adminApi.triggerIngestionRun({
        sourceCode: sourceCode.trim(),
        maxPages: Number(maxPages),
        maxItems: Number(maxItems),
        syncToAdmin,
      });
      setSuccess(
        `${t('ingestionTriggerSuccess', locale)} — ${r.runId.slice(0, 8)}… d=${r.discovered} c=${r.captured} n=${r.normalised} e=${r.enriched} ready=${r.curationReady} rej=${r.rejected}`,
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setError(
          `${t('ingestionTriggerFailed', locale)}: ${body?.message ?? err.status}`,
        );
      } else {
        setError(t('ingestionTriggerFailed', locale));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>
        <span>{t('ingestionSource', locale)}</span>
        <input
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          required
          maxLength={80}
        />
      </label>
      <label>
        <span>{t('ingestionMaxPages', locale)}</span>
        <input
          type="number"
          min={1}
          max={50}
          value={maxPages}
          onChange={(e) => setMaxPages(e.target.value)}
        />
      </label>
      <label>
        <span>{t('ingestionMaxItems', locale)}</span>
        <input
          type="number"
          min={1}
          max={500}
          value={maxItems}
          onChange={(e) => setMaxItems(e.target.value)}
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={syncToAdmin}
          onChange={(e) => setSyncToAdmin(e.target.checked)}
        />
        <span>{t('ingestionSyncToAdmin', locale)}</span>
      </label>
      {success && (
        <p role="status" className="form-success">
          {success}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {t('ingestionTrigger', locale)}
      </button>
    </form>
  );
}
