'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, ApiError } from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

export function EtimadEnqueueForm({
  locale,
}: {
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const job = await adminApi.enqueueIngestion({
        kind: 'etimad',
        payload: { text },
      });
      setLast(job.id);
      setText('');
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
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="etimad-text">{t('rawNotice', locale)}</label>
      <textarea
        id="etimad-text"
        required
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          locale === 'ar'
            ? 'الصق نص إعلان المنافسة هنا...'
            : 'Paste the tender notice text here…'
        }
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {last && !error && (
        <p className="form-success">
          ✓ {locale === 'ar' ? 'تمت إضافة الوظيفة' : 'Job enqueued'}:{' '}
          <code className="mono">{last}</code>
        </p>
      )}
      <button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? t('saving', locale) : t('enqueue', locale)}
      </button>
    </form>
  );
}
