/**
 * Arabic-first bilingual strings + locale helper. Tiny, dependency-free.
 * Server components receive `locale` via a cookie/header; for MVP we
 * default to Arabic with English as the secondary surface.
 */

export type Locale = 'ar' | 'en';

export const DEFAULT_LOCALE: Locale = 'ar';

type Pair = { ar: string; en: string };

export const strings = {
  appName: { ar: 'منصة جاهزية العطاءات', en: 'BidReady KSA' },
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  openTenders: { ar: 'العطاءات المفتوحة', en: 'Open tenders' },
  bidReady: { ar: 'جاهزة للتقديم', en: 'Bid-ready' },
  criticalGaps: { ar: 'فجوات حرجة', en: 'Critical gaps' },
  expiringDocs: { ar: 'وثائق منتهية قريباً', en: 'Docs expiring' },
  tenderFeed: { ar: 'قائمة العطاءات', en: 'Tender feed' },
  taskRail: { ar: 'المهام الحرجة', en: 'Critical tasks' },
  expiryRadar: { ar: 'رادار انتهاء الصلاحية', en: 'Expiry radar' },
  status: { ar: 'الحالة', en: 'Status' },
  owner: { ar: 'المسؤول', en: 'Owner' },
  due: { ar: 'الاستحقاق', en: 'Due' },
  risk: { ar: 'المخاطر', en: 'Risk' },
} satisfies Record<string, Pair>;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, locale: Locale = DEFAULT_LOCALE): string {
  return strings[key][locale];
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
