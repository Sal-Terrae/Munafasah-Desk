import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from './i18n';

/**
 * Resolve the current locale on the server from the request cookie.
 * Defaults to Arabic when missing or invalid. Client components don't
 * need this — they read `useLocale()` from the LocaleProvider.
 */
export async function resolveServerLocale(): Promise<Locale> {
  if (typeof window !== 'undefined') {
    return DEFAULT_LOCALE;
  }
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Format an integer for the active locale. */
export function formatNumber(value: number, locale: Locale): string {
  const tag = locale === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(tag).format(value);
}

/** Format a SAR currency value. */
export function formatSar(value: number, locale: Locale): string {
  const tag = locale === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format an ISO date to the locale's calendar style. */
export function formatDate(iso: string | Date, locale: Locale): string {
  const tag = locale === 'ar' ? 'ar-SA' : 'en-US';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(tag, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
