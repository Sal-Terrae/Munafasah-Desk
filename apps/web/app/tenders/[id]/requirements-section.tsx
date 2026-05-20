'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type TenderRequirement,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

interface ParsedLine {
  category: string;
  text: string;
}

function parseBulkText(text: string): ParsedLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const colon = line.indexOf(':');
      if (colon < 0) return { category: 'other', text: line };
      const category = line.slice(0, colon).trim().toLowerCase();
      const rest = line.slice(colon + 1).trim();
      return { category: category || 'other', text: rest || line };
    })
    .filter((r) => r.text.length > 0);
}

export function RequirementsSection({
  tenderId,
  initial,
  locale,
}: {
  tenderId: string;
  initial: TenderRequirement[];
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseBulkText(bulk);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (parsed.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await tenderApi.bulkAddRequirements(tenderId, parsed);
      setBulk('');
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
    <section className="panel">
      <header className="panel-header">
        <h2>{t('requirementsTitle', locale)}</h2>
        <span className="muted small">{initial.length}</span>
      </header>

      {initial.length === 0 ? (
        <p className="muted">{t('noRequirementsYet', locale)}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">{t('category', locale)}</th>
              <th scope="col">{t('textLabel', locale)}</th>
              <th scope="col">{t('itemRisk', locale)}</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="chip">{r.category}</span>
                </td>
                <td>{r.text}</td>
                <td>
                  <span className={`chip chip-${r.risk}`}>{r.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <details className="bulk-add">
        <summary>{t('addRequirements', locale)}</summary>
        <form className="admin-form" onSubmit={onSubmit}>
          <label htmlFor="bulk-text">{t('bulkPaste', locale)}</label>
          <textarea
            id="bulk-text"
            rows={6}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={t('bulkExample', locale)}
          />
          {parsed.length > 0 && (
            <p className="muted small">
              {parsed.length}{' '}
              {locale === 'ar' ? 'سطر سيُضاف' : 'lines will be added'}
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || parsed.length === 0}
            aria-busy={busy}
          >
            {busy ? t('saving', locale) : t('save', locale)}
          </button>
        </form>
      </details>
    </section>
  );
}
