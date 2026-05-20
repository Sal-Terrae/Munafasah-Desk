'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  ApiError,
  type DpoContact,
  type UpsertDpoContactInput,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function DpoContactForm({
  initial,
  locale,
}: {
  initial: DpoContact | null;
  locale: Locale;
}): JSX.Element {
  const [form, setForm] = useState<UpsertDpoContactInput>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    authorityEmail: initial?.authorityEmail ?? '',
    retentionPolicyDays: initial?.retentionPolicyDays ?? 2555,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await adminApi.upsertDpoContact({
        ...form,
        phone: form.phone || null,
      });
      setSavedAt(saved.updatedAt);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('accessDenied', locale));
      } else if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setError(body?.message ?? 'Save failed');
      } else {
        setError('Save failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      {!initial && (
        <p className="muted">{t('notConfigured', locale)}</p>
      )}
      <label htmlFor="dpo-name">{t('dpoName', locale)}</label>
      <input
        id="dpo-name"
        type="text"
        required
        maxLength={120}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <label htmlFor="dpo-email">{t('dpoEmail', locale)}</label>
      <input
        id="dpo-email"
        type="email"
        required
        maxLength={254}
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <label htmlFor="dpo-phone">{t('dpoPhone', locale)}</label>
      <input
        id="dpo-phone"
        type="tel"
        maxLength={40}
        value={form.phone ?? ''}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />

      <label htmlFor="authority-email">{t('authorityEmail', locale)}</label>
      <input
        id="authority-email"
        type="email"
        required
        maxLength={254}
        value={form.authorityEmail}
        onChange={(e) =>
          setForm({ ...form, authorityEmail: e.target.value })
        }
      />

      <label htmlFor="retention-days">
        {t('retentionPolicyDays', locale)}
      </label>
      <input
        id="retention-days"
        type="number"
        min={30}
        max={36500}
        value={form.retentionPolicyDays ?? 2555}
        onChange={(e) =>
          setForm({
            ...form,
            retentionPolicyDays: Number(e.target.value),
          })
        }
      />

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="form-success">
          ✓ {new Date(savedAt).toLocaleString()}
        </p>
      )}
      <button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? t('saving', locale) : t('save', locale)}
      </button>
    </form>
  );
}
