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
  // ----- Admin -----
  adminTitle: { ar: 'الإدارة', en: 'Administration' },
  adminLead: {
    ar: 'وصول لإعدادات حماية البيانات وعمليات الامتثال والاستيعاب.',
    en: 'PDPL controls + compliance workflows + ingestion oversight.',
  },
  adminCardDpo: { ar: 'مسؤول حماية البيانات', en: 'DPO contact' },
  adminCardDpoDesc: {
    ar: 'بيانات الاتصال + جهة الإبلاغ + سياسة الاحتفاظ.',
    en: 'Contact details + authority recipient + retention policy.',
  },
  adminCardDsr: { ar: 'حقوق أصحاب البيانات', en: 'Data subject rights' },
  adminCardDsrDesc: {
    ar: 'طلبات الوصول والمسح والتصحيح + سير الموافقات.',
    en: 'Access / erasure / rectification requests + approval workflow.',
  },
  adminCardRetention: { ar: 'إجراءات الاحتفاظ', en: 'Retention actions' },
  adminCardRetentionDesc: {
    ar: 'إتلاف الوثائق بموافقة منفصلة + المسح اليومي.',
    en: 'Audit-trailed document destruction + daily sweep.',
  },
  adminCardConsent: { ar: 'سجل الموافقات', en: 'Consent ledger' },
  adminCardConsentDesc: {
    ar: 'سجل منح/سحب الموافقة لكل غرض ولكل عميل.',
    en: 'Grant / withdraw events per purpose, per subject.',
  },
  adminCardIngestion: { ar: 'وظائف الاستيعاب', en: 'Ingestion jobs' },
  adminCardIngestionDesc: {
    ar: 'طابور المعالجة (إعتماد، رفع يدوي، بريد وارد).',
    en: 'Worker queue (Etimad, manual upload, inbound email).',
  },
  open: { ar: 'فتح', en: 'Open' },
  save: { ar: 'حفظ', en: 'Save' },
  saving: { ar: 'جارٍ الحفظ...', en: 'Saving…' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  refresh: { ar: 'تحديث', en: 'Refresh' },
  notConfigured: { ar: 'لم يتم التهيئة بعد', en: 'Not configured yet' },
  approve: { ar: 'اعتماد', en: 'Approve' },
  deny: { ar: 'رفض', en: 'Deny' },
  execute: { ar: 'تنفيذ', en: 'Execute' },
  manualSweep: { ar: 'تشغيل المسح يدوياً', en: 'Run manual sweep' },
  filterAll: { ar: 'الكل', en: 'All' },
  filterPending: { ar: 'قيد الانتظار', en: 'Pending' },
  filterApproved: { ar: 'معتمد', en: 'Approved' },
  filterDenied: { ar: 'مرفوض', en: 'Denied' },
  filterCompleted: { ar: 'مكتمل', en: 'Completed' },
  filterExecuted: { ar: 'منفّذ', en: 'Executed' },
  filterFailed: { ar: 'فشل', en: 'Failed' },
  filterProcessing: { ar: 'قيد المعالجة', en: 'Processing' },
  filterByStatus: { ar: 'تصفية حسب الحالة', en: 'Filter by status' },
  filterByKind: { ar: 'تصفية حسب النوع', en: 'Filter by kind' },
  noResults: { ar: 'لا توجد نتائج', en: 'No results' },
  dpoName: { ar: 'الاسم', en: 'Name' },
  dpoEmail: { ar: 'البريد الإلكتروني للمسؤول', en: 'DPO email' },
  dpoPhone: { ar: 'الهاتف (اختياري)', en: 'Phone (optional)' },
  authorityEmail: {
    ar: 'بريد الجهة المختصة (سدايا)',
    en: 'Authority email (SDAIA)',
  },
  retentionPolicyDays: {
    ar: 'سياسة الاحتفاظ (بالأيام)',
    en: 'Retention policy (days)',
  },
  subjectEmail: { ar: 'بريد صاحب البيانات', en: 'Subject email' },
  requestType: { ar: 'نوع الطلب', en: 'Request type' },
  dsrAccess: { ar: 'وصول', en: 'Access' },
  dsrErasure: { ar: 'مسح', en: 'Erasure' },
  dsrRectification: { ar: 'تصحيح', en: 'Rectification' },
  notes: { ar: 'ملاحظات', en: 'Notes' },
  purpose: { ar: 'الغرض', en: 'Purpose' },
  consentState: { ar: 'الحالة', en: 'State' },
  granted: { ar: 'ممنوحة', en: 'Granted' },
  withdrawn: { ar: 'مسحوبة', en: 'Withdrawn' },
  recordEvent: { ar: 'تسجيل حدث', en: 'Record event' },
  current: { ar: 'الحالة الحالية', en: 'Current' },
  notRecorded: {
    ar: 'غير مسجّل (افتراضي: مرفوض)',
    en: 'Not recorded (default deny)',
  },
  kind: { ar: 'النوع', en: 'Kind' },
  enqueue: { ar: 'إضافة وظيفة', en: 'Enqueue job' },
  kindEtimad: { ar: 'إعتماد', en: 'Etimad' },
  kindUpload: { ar: 'رفع', en: 'Upload' },
  kindEmail: { ar: 'بريد', en: 'Email' },
  kindLink: { ar: 'رابط', en: 'Link' },
  rawNotice: { ar: 'نص الإعلان', en: 'Notice text' },
  resultPayload: { ar: 'النتيجة', en: 'Result' },
  errorMessage: { ar: 'رسالة الخطأ', en: 'Error' },
  attempts: { ar: 'المحاولات', en: 'Attempts' },
  backToAdmin: { ar: '← العودة إلى الإدارة', en: '← Back to admin' },
  accessDenied: {
    ar: 'لا تملك الصلاحية لهذه الإجراءات.',
    en: 'You do not have permission to perform these actions.',
  },
  clientsTitle: { ar: 'العملاء', en: 'Clients' },
  clientsLead: {
    ar: 'سجّل الشركات/الجهات التي تقدّم لها العطاءات قبل إنشاء المنافسات.',
    en: 'Register the companies/agencies you bid for before creating tenders.',
  },
  newClient: { ar: 'عميل جديد', en: 'New client' },
  clientName: { ar: 'اسم العميل', en: 'Client name' },
  tenderTitleLabel: { ar: 'عنوان المنافسة', en: 'Tender title' },
  tendersTitle: { ar: 'العطاءات', en: 'Tenders' },
  tendersLead: {
    ar: 'إنشاء وإدارة العطاءات المرتبطة بكل عميل.',
    en: 'Create and manage tenders linked to each client.',
  },
  newTender: { ar: 'منافسة جديدة', en: 'New tender' },
  client: { ar: 'العميل', en: 'Client' },
  sourceLabel: { ar: 'المصدر', en: 'Source' },
  selectClient: { ar: 'اختر عميلاً', en: 'Select a client' },
  noClientsYet: {
    ar: 'لا يوجد عملاء بعد — أنشئ عميلاً أولاً.',
    en: 'No clients yet — create one first.',
  },
  noTendersYet: {
    ar: 'لا توجد عطاءات بعد. ابدأ بإضافة منافسة جديدة.',
    en: 'No tenders yet. Add a new tender to get started.',
  },
  requirementsTitle: { ar: 'المتطلبات', en: 'Requirements' },
  matricesTitle: { ar: 'مصفوفات الامتثال', en: 'Compliance matrices' },
  accessTitle: { ar: 'الصلاحيات', en: 'Access' },
  category: { ar: 'الفئة', en: 'Category' },
  textLabel: { ar: 'النص', en: 'Text' },
  addRequirements: { ar: 'إضافة متطلبات', en: 'Add requirements' },
  bulkPaste: {
    ar: 'الصق سطراً واحداً لكل متطلب (الفئة: النص)',
    en: 'Paste one requirement per line: "category: text"',
  },
  bulkExample: {
    ar: 'مثال:\nlegal: سجل تجاري ساري\nfinancial: ضمان بنكي',
    en: 'Example:\nlegal: Valid commercial registration\nfinancial: Bank guarantee',
  },
  generateMatrixAction: { ar: 'إنشاء مصفوفة جديدة', en: 'Generate new matrix' },
  matrixVersion: { ar: 'الإصدار', en: 'Version' },
  items: { ar: 'العناصر', en: 'Items' },
  noMatricesYet: {
    ar: 'لا توجد مصفوفات بعد. اضغط "إنشاء مصفوفة جديدة" لتوليد واحدة.',
    en: 'No matrices yet. Click "Generate new matrix" to create one.',
  },
  noRequirementsYet: {
    ar: 'لا توجد متطلبات بعد.',
    en: 'No requirements yet.',
  },
  itemStatus: { ar: 'الحالة', en: 'Status' },
  itemRisk: { ar: 'المخاطر', en: 'Risk' },
  itemMissing: { ar: 'مفقودة', en: 'Missing' },
  itemPartial: { ar: 'جزئية', en: 'Partial' },
  itemSatisfied: { ar: 'مكتملة', en: 'Satisfied' },
  itemOverridden: { ar: 'متجاوَزة', en: 'Overridden' },
  riskLow: { ar: 'منخفضة', en: 'Low' },
  riskMedium: { ar: 'متوسطة', en: 'Medium' },
  riskHigh: { ar: 'مرتفعة', en: 'High' },
  riskCritical: { ar: 'حرجة', en: 'Critical' },
  userIdLabel: { ar: 'معرّف المستخدم', en: 'User ID' },
  role: { ar: 'الدور', en: 'Role' },
  grantAccess: { ar: 'منح صلاحية', en: 'Grant access' },
  revoke: { ar: 'سحب', en: 'Revoke' },
  noAccessYet: {
    ar: 'لم تُمنح صلاحية لأحد بعد.',
    en: 'No access has been granted yet.',
  },
  statusIntake: { ar: 'استلام', en: 'Intake' },
  statusReview: { ar: 'مراجعة', en: 'Review' },
  statusReady: { ar: 'جاهز', en: 'Ready' },
  statusSubmitted: { ar: 'مُقدَّم', en: 'Submitted' },
  changeStatus: { ar: 'تغيير الحالة', en: 'Change status' },
  adminCardAudit: { ar: 'سجل التدقيق', en: 'Audit log' },
  adminCardAuditDesc: {
    ar: 'آخر الأحداث المسجّلة لكل المستخدمين والإجراءات الحساسة.',
    en: 'Recent audited events across users and sensitive actions.',
  },
  auditTitle: { ar: 'سجل التدقيق', en: 'Audit log' },
  auditAction: { ar: 'الإجراء', en: 'Action' },
  auditEntity: { ar: 'الكيان', en: 'Entity' },
  auditTimestamp: { ar: 'الوقت', en: 'Timestamp' },
  auditUser: { ar: 'المستخدم', en: 'User' },
  auditAnonymised: { ar: 'مجهَّل', en: 'Anonymised' },
} satisfies Record<string, Pair>;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, locale: Locale = DEFAULT_LOCALE): string {
  return strings[key][locale];
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
