/** Deterministic DPO processing inventory (PDPL Article 31 / RoPA). */
export const PROCESSING_INVENTORY = [
  {
    purpose: 'Tender bid readiness orchestration',
    dataCategories: ['user account', 'tender metadata', 'document filenames'],
    lawfulBasis: 'legitimate interest + contract',
    retention: 'tender lifecycle + 2 years',
    crossBorderTransfer: false,
  },
  {
    purpose: 'Audit trail (PDPL accountability)',
    dataCategories: ['user id', 'action', 'entity refs', 'timestamps'],
    lawfulBasis: 'legal obligation',
    retention: '5 years',
    crossBorderTransfer: false,
  },
  {
    purpose: 'Authentication',
    dataCategories: ['email', 'hashed password', 'role'],
    lawfulBasis: 'contract',
    retention: 'account lifecycle + 90 days',
    crossBorderTransfer: false,
  },
] as const;
