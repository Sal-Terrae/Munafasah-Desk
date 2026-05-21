'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, adminApi } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

interface FormState {
  subjectName: string;
  subjectEmail: string;
  topic: string;
  provider: string;
  completedAt: string;
  validUntil: string;
  evidenceRef: string;
  notes: string;
}

const empty: FormState = {
  subjectName: '',
  subjectEmail: '',
  topic: '',
  provider: '',
  completedAt: '',
  validUntil: '',
  evidenceRef: '',
  notes: '',
};

export function TrainingRegisterForm({
  locale,
}: {
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminApi.createTrainingRecord({
        subjectName: form.subjectName.trim(),
        subjectEmail: form.subjectEmail.trim(),
        topic: form.topic.trim(),
        provider: form.provider.trim() || null,
        completedAt: new Date(form.completedAt).toISOString(),
        validUntil: form.validUntil
          ? new Date(form.validUntil).toISOString()
          : null,
        evidenceRef: form.evidenceRef.trim() || null,
        notes: form.notes.trim() || null,
      });
      setForm(empty);
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as
          | { message?: string | string[]; error?: string }
          | null;
        setError(
          Array.isArray(body?.message)
            ? body.message.join(', ')
            : (body?.message ?? body?.error ?? 'Failed'),
        );
      } else {
        setError('Failed');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn-primary"
        onClick={() => setOpen(true)}
      >
        {t('trainingAddRecord', locale)}
      </button>
    );
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>
        <span>{t('trainingSubjectName', locale)}</span>
        <input
          value={form.subjectName}
          onChange={(e) => update('subjectName', e.target.value)}
          required
          maxLength={200}
        />
      </label>
      <label>
        <span>{t('trainingSubjectEmail', locale)}</span>
        <input
          type="email"
          value={form.subjectEmail}
          onChange={(e) => update('subjectEmail', e.target.value)}
          required
          maxLength={254}
        />
      </label>
      <label>
        <span>{t('trainingTopic', locale)}</span>
        <input
          value={form.topic}
          onChange={(e) => update('topic', e.target.value)}
          required
          maxLength={200}
        />
      </label>
      <label>
        <span>{t('trainingProvider', locale)}</span>
        <input
          value={form.provider}
          onChange={(e) => update('provider', e.target.value)}
          maxLength={120}
        />
      </label>
      <label>
        <span>{t('trainingCompletedAt', locale)}</span>
        <input
          type="date"
          value={form.completedAt}
          onChange={(e) => update('completedAt', e.target.value)}
          required
        />
      </label>
      <label>
        <span>{t('trainingValidUntil', locale)}</span>
        <input
          type="date"
          value={form.validUntil}
          onChange={(e) => update('validUntil', e.target.value)}
        />
      </label>
      <label>
        <span>{t('trainingEvidenceRef', locale)}</span>
        <input
          value={form.evidenceRef}
          onChange={(e) => update('evidenceRef', e.target.value)}
          maxLength={500}
        />
      </label>
      <label>
        <span>{t('trainingNotes', locale)}</span>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          maxLength={2000}
          rows={3}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="row-actions">
        <button
          type="button"
          className="btn-sm"
          disabled={busy}
          onClick={() => {
            setForm(empty);
            setOpen(false);
            setError(null);
          }}
        >
          {t('trainingCancel', locale)}
        </button>
        <button type="submit" disabled={busy}>
          {t('trainingSave', locale)}
        </button>
      </div>
    </form>
  );
}
