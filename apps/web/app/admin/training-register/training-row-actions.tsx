'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  adminApi,
  type DpoTrainingRecord,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function TrainingRowActions({
  row,
  locale,
}: {
  row: DpoTrainingRecord;
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    topic: row.topic,
    provider: row.provider ?? '',
    completedAt: isoToDateInput(row.completedAt),
    validUntil: isoToDateInput(row.validUntil),
    evidenceRef: row.evidenceRef ?? '',
    notes: row.notes ?? '',
  });

  async function remove(): Promise<void> {
    if (!window.confirm(t('trainingConfirmDelete', locale))) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.removeTrainingRecord(row.id);
      router.refresh();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  async function save(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateTrainingRecord(row.id, {
        topic: form.topic.trim(),
        provider: form.provider.trim() || null,
        completedAt: new Date(form.completedAt).toISOString(),
        validUntil: form.validUntil
          ? new Date(form.validUntil).toISOString()
          : null,
        evidenceRef: form.evidenceRef.trim() || null,
        notes: form.notes.trim() || null,
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form className="row-edit-form" onSubmit={save}>
        <input
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          placeholder={t('trainingTopic', locale)}
          required
        />
        <input
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          placeholder={t('trainingProvider', locale)}
        />
        <input
          type="date"
          value={form.completedAt}
          onChange={(e) => setForm({ ...form, completedAt: e.target.value })}
          required
        />
        <input
          type="date"
          value={form.validUntil}
          onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
        />
        <div className="row-actions">
          <button
            type="button"
            className="btn-sm"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            {t('trainingCancel', locale)}
          </button>
          <button type="submit" className="btn-sm btn-primary" disabled={busy}>
            {t('trainingSave', locale)}
          </button>
        </div>
        {error && (
          <span role="alert" className="row-error">
            {error}
          </span>
        )}
      </form>
    );
  }

  return (
    <div className="row-actions">
      <button
        type="button"
        className="btn-sm"
        disabled={busy}
        onClick={() => setEditing(true)}
      >
        {t('trainingEdit', locale)}
      </button>
      <button
        type="button"
        className="btn-sm btn-danger"
        disabled={busy}
        onClick={remove}
      >
        {t('trainingDelete', locale)}
      </button>
      {error && (
        <span role="alert" className="row-error">
          {error}
        </span>
      )}
    </div>
  );
}

function extractError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as
      | { message?: string | string[]; error?: string }
      | null;
    if (Array.isArray(body?.message)) return body.message.join(', ');
    return body?.message ?? body?.error ?? 'Failed';
  }
  return 'Failed';
}
