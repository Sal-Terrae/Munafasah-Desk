'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type TenderAccess,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

const ROLES = ['Owner', 'Editor', 'Reviewer', 'Viewer'] as const;

export function AccessSection({
  tenderId,
  initial,
  locale,
}: {
  tenderId: string;
  initial: TenderAccess[];
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('Reviewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grant(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await tenderApi.grantAccess(tenderId, {
        userId: userId.trim(),
        role,
      });
      setUserId('');
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

  async function revoke(row: TenderAccess): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await tenderApi.revokeAccess(tenderId, row.userId);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(t('accessDenied', locale));
      } else {
        setError('Failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('accessTitle', locale)}</h2>
      </header>

      <form className="admin-form-inline" onSubmit={grant} noValidate>
        <label htmlFor="access-user">{t('userIdLabel', locale)}</label>
        <input
          id="access-user"
          type="text"
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="uuid"
        />
        <label htmlFor="access-role">{t('role', locale)}</label>
        <select
          id="access-role"
          value={role}
          onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" disabled={busy || !userId.trim()} aria-busy={busy}>
          {busy ? t('saving', locale) : t('grantAccess', locale)}
        </button>
      </form>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {initial.length === 0 ? (
        <p className="muted">{t('noAccessYet', locale)}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">{t('userIdLabel', locale)}</th>
              <th scope="col">{t('role', locale)}</th>
              <th scope="col">{t('auditTimestamp', locale)}</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {initial.map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.userId.slice(0, 8)}…</td>
                <td>
                  <span className="chip">{a.role}</span>
                </td>
                <td className="muted">
                  {new Date(a.grantedAt).toLocaleString()}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-sm btn-danger"
                    disabled={busy}
                    onClick={() => void revoke(a)}
                  >
                    {t('revoke', locale)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
