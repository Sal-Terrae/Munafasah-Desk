/**
 * Arabic-first bilingual strings + locale helper. Tiny, dependency-free.
 * Server components receive `locale` via the `bidready_locale` cookie;
 * the default is Arabic.
 */

export type Locale = 'ar' | 'en';

export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'bidready_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'en';
}

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
  signIn: { ar: 'تسجيل الدخول', en: 'Sign in' },
  signingIn: { ar: 'جاري الدخول...', en: 'Signing in…' },
  signOut: { ar: 'تسجيل الخروج', en: 'Sign out' },
  signInPrompt: {
    ar: 'الرجاء تسجيل الدخول للوصول إلى مساحة العمل',
    en: 'Sign in to access your workspace',
  },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  password: { ar: 'كلمة المرور', en: 'Password' },
  emptyTenders: { ar: 'لا توجد عطاءات بعد', en: 'No tenders yet' },
  emptyTasks: { ar: 'لا توجد مهام حرجة', en: 'No critical tasks' },
  emptyExpiring: { ar: 'لا توجد وثائق قاربت على الانتهاء', en: 'No expiring docs' },
  loadFailed: {
    ar: 'تعذّر تحميل البيانات. أعد المحاولة لاحقاً.',
    en: 'Could not load data. Try again later.',
  },
  navDashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  navTenders: { ar: 'العطاءات', en: 'Tenders' },
  navDocuments: { ar: 'الوثائق', en: 'Documents' },
  navCompliance: { ar: 'الامتثال', en: 'Compliance' },
  navReports: { ar: 'التقارير', en: 'Reports' },
  navAdmin: { ar: 'الإدارة', en: 'Admin' },
  navSettings: { ar: 'الإعدادات', en: 'Settings' },
  skipToContent: {
    ar: 'انتقل إلى المحتوى الرئيسي',
    en: 'Skip to main content',
  },
  toggleLocale: { ar: 'English', en: 'العربية' },
} satisfies Record<string, Pair>;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, locale: Locale = DEFAULT_LOCALE): string {
  return strings[key][locale];
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
