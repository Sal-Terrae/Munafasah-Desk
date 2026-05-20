'use client';

import type { JSX } from 'react';
import { useLocale } from '../../lib/locale-context';
import { t, type Locale } from '../../lib/i18n';

export function SettingsLocaleControl({
  locale: initial,
}: {
  locale: Locale;
}): JSX.Element {
  let locale = initial;
  let setLocale: (l: Locale) => void = () => undefined;
  try {
    const ctx = useLocale();
    locale = ctx.locale;
    setLocale = ctx.setLocale;
  } catch {
    // not inside the provider — render with the SSR locale
  }
  return (
    <div className="filter-row">
      <button
        type="button"
        className={`chip ${locale === 'ar' ? 'chip-active' : ''}`}
        onClick={() => setLocale('ar')}
      >
        العربية
      </button>
      <button
        type="button"
        className={`chip ${locale === 'en' ? 'chip-active' : ''}`}
        onClick={() => setLocale('en')}
      >
        English
      </button>
      <span className="muted small">
        {locale === 'ar' ? 'الواجهة الحالية' : 'Current'}
      </span>
    </div>
  );
}
