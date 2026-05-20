'use client';

import { useEffect, useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  tenderApi,
  ApiError,
  type ComplianceItem,
  type ComplianceMatrixRow,
} from '../../../lib/api';
import { t, type Locale, type StringKey } from '../../../lib/i18n';

const STATUS_LABEL: Record<ComplianceItem['status'], StringKey> = {
  missing: 'itemMissing',
  partial: 'itemPartial',
  satisfied: 'itemSatisfied',
  overridden: 'itemOverridden',
};
const RISK_LABEL: Record<ComplianceItem['risk'], StringKey> = {
  low: 'riskLow',
  medium: 'riskMedium',
  high: 'riskHigh',
  critical: 'riskCritical',
};

export function MatricesSection({
  tenderId,
  initial,
  locale,
}: {
  tenderId: string;
  initial: ComplianceMatrixRow[];
  locale: Locale;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openVersion, setOpenVersion] = useState<number | null>(
    initial[0]?.version ?? null,
  );
  const [items, setItems] = useState<ComplianceItem[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await tenderApi.generateMatrix(tenderId);
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

  useEffect(() => {
    if (openVersion === null) {
      setItems(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingItems(true);
      try {
        const data = await tenderApi.getMatrix(tenderId, openVersion);
        if (!cancelled) setItems(data.items);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenderId, openVersion]);

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('matricesTitle', locale)}</h2>
        <button
          type="button"
          className="btn"
          onClick={() => void generate()}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? t('saving', locale) : t('generateMatrixAction', locale)}
        </button>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {initial.length === 0 ? (
        <p className="muted">{t('noMatricesYet', locale)}</p>
      ) : (
        <>
          <div className="filter-row">
            {initial.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setOpenVersion(m.version)}
                className={`chip ${openVersion === m.version ? 'chip-active' : ''}`}
              >
                v{m.version}
              </button>
            ))}
          </div>
          {loadingItems ? (
            <p className="muted">…</p>
          ) : items && items.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('category', locale)}</th>
                  <th scope="col">{t('textLabel', locale)}</th>
                  <th scope="col">{t('itemStatus', locale)}</th>
                  <th scope="col">{t('itemRisk', locale)}</th>
                  <th scope="col">{t('owner', locale)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="chip">{item.category}</span>
                    </td>
                    <td>{item.requirementText}</td>
                    <td>
                      <span className={`chip chip-${item.status}`}>
                        {t(STATUS_LABEL[item.status], locale)}
                      </span>
                    </td>
                    <td>
                      <span className={`chip chip-${item.risk}`}>
                        {t(RISK_LABEL[item.risk], locale)}
                      </span>
                    </td>
                    <td className="muted">{item.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">{t('noResults', locale)}</p>
          )}
        </>
      )}
    </section>
  );
}
