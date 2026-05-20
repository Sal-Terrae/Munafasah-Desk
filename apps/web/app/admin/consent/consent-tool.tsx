'use client';

import { useState, type FormEvent, type JSX } from 'react';
import {
  adminApi,
  ApiError,
  type ConsentEvent,
} from '../../../lib/api';
import { t, type Locale } from '../../../lib/i18n';

interface CurrentState {
  state: 'granted' | 'withdrawn' | null;
}

export function ConsentTool({ locale }: { locale: Locale }): JSX.Element {
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('whatsapp_reminders');
  const [history, setHistory] = useState<ConsentEvent[] | null>(null);
  const [current, setCurrent] = useState<CurrentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordState, setRecordState] =
    useState<'granted' | 'withdrawn'>('granted');

  async function lookup(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const [list, check] = await Promise.all([
        adminApi.listConsentForSubject(email),
        adminApi.checkConsent(email, purpose),
      ]);
      setHistory(list);
      setCurrent({ state: check.state });
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

  async function record(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.recordConsent({
        subjectEmail: email,
        purpose,
        state: recordState,
        source: 'admin-ui',
      });
      await lookup();
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
    <div className="stack">
      <section className="panel">
        <h2>{t('current', locale)}</h2>
        <form
          className="admin-form-inline"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
          noValidate
        >
          <label htmlFor="cs-email">{t('subjectEmail', locale)}</label>
          <input
            id="cs-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="cs-purpose">{t('purpose', locale)}</label>
          <input
            id="cs-purpose"
            type="text"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <button type="submit" disabled={busy} aria-busy={busy}>
            {t('refresh', locale)}
          </button>
        </form>
        {current && (
          <p className="current-state">
            {t('current', locale)}:{' '}
            {current.state === null ? (
              <span className="chip">{t('notRecorded', locale)}</span>
            ) : (
              <span className={`chip chip-${current.state}`}>
                {t(current.state === 'granted' ? 'granted' : 'withdrawn', locale)}
              </span>
            )}
          </p>
        )}
      </section>

      {email && (
        <section className="panel">
          <h2>{t('recordEvent', locale)}</h2>
          <form className="admin-form-inline" onSubmit={record} noValidate>
            <label htmlFor="cs-state">{t('consentState', locale)}</label>
            <select
              id="cs-state"
              value={recordState}
              onChange={(e) =>
                setRecordState(e.target.value as 'granted' | 'withdrawn')
              }
            >
              <option value="granted">{t('granted', locale)}</option>
              <option value="withdrawn">{t('withdrawn', locale)}</option>
            </select>
            <button type="submit" disabled={busy} aria-busy={busy}>
              {busy ? t('saving', locale) : t('save', locale)}
            </button>
          </form>
        </section>
      )}

      {history && (
        <section className="panel">
          <h2>History — {email}</h2>
          {history.length === 0 ? (
            <p className="muted">{t('noResults', locale)}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('purpose', locale)}</th>
                  <th scope="col">{t('consentState', locale)}</th>
                  <th scope="col">recordedAt</th>
                  <th scope="col">source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="mono">{row.purpose}</td>
                    <td>
                      <span className={`chip chip-${row.state}`}>
                        {t(row.state === 'granted' ? 'granted' : 'withdrawn', locale)}
                      </span>
                    </td>
                    <td className="muted">
                      {new Date(row.recordedAt).toLocaleString()}
                    </td>
                    <td className="muted">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
