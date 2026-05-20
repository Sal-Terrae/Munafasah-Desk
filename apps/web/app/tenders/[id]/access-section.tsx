'use client';

import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type PublicUser,
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
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [usersDenied, setUsersDenied] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('Reviewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users once on mount. The endpoint is Owner-only; if the
  // caller isn't Owner we degrade gracefully to the free-text input.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await tenderApi.listUsers();
        if (!cancelled) {
          setUsers(list);
          if (!userId && list.length > 0) setUserId(list[0].id);
        }
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 403) {
          setUsersDenied(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only fetch on mount; subsequent refreshes use
    // router.refresh() which re-runs the server component, not this
    // effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userById: Record<string, PublicUser> = (users ?? []).reduce(
    (acc, u) => {
      acc[u.id] = u;
      return acc;
    },
    {} as Record<string, PublicUser>,
  );

  const grantedIds = new Set(initial.map((a) => a.userId));
  const grantable = (users ?? []).filter((u) => !grantedIds.has(u.id));

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
        <label htmlFor="access-user">
          {usersDenied || !users ? t('userIdLabel', locale) : t('user', locale)}
        </label>
        {users && !usersDenied ? (
          grantable.length === 0 ? (
            <p className="muted">
              {users.length === 0
                ? t('noResults', locale)
                : locale === 'ar'
                  ? 'تم منح الصلاحية لجميع المستخدمين.'
                  : 'All users already have access.'}
            </p>
          ) : (
            <select
              id="access-user"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {grantable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) — {u.email}
                </option>
              ))}
            </select>
          )
        ) : (
          <input
            id="access-user"
            type="text"
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="uuid"
          />
        )}
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
        <button
          type="submit"
          disabled={busy || !userId.trim() || (users !== null && grantable.length === 0)}
          aria-busy={busy}
        >
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
              <th scope="col">{t('user', locale)}</th>
              <th scope="col">{t('role', locale)}</th>
              <th scope="col">{t('auditTimestamp', locale)}</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {initial.map((a) => {
              const u = userById[a.userId];
              return (
                <tr key={a.id}>
                  <td>
                    {u ? (
                      <>
                        <strong>{u.name}</strong>
                        <br />
                        <span className="muted small">{u.email}</span>
                      </>
                    ) : (
                      <span className="mono">{a.userId.slice(0, 8)}…</span>
                    )}
                  </td>
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
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
