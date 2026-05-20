/**
 * Symbol-based DI tokens for repository interfaces. Services should
 * depend on these tokens rather than the concrete Prisma classes —
 * keeps test wiring honest (the fake can be bound to the same token)
 * and lets us swap implementations (e.g. in-memory, Firestore) per
 * profile without touching service code.
 *
 * One symbol per repo interface. The string description is the only
 * hint Nest's DI surfaces in error messages, so keep it readable.
 */

export const USER_REPOSITORY = Symbol('IUserRepository');
export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository');
export const CLIENT_COMPANY_REPOSITORY = Symbol('IClientCompanyRepository');
export const TENDER_REPOSITORY = Symbol('ITenderRepository');
export const CLIENT_DOCUMENT_REPOSITORY = Symbol('IClientDocumentRepository');
export const AUDIT_EVENT_REPOSITORY = Symbol('IAuditEventRepository');
export const COMPLIANCE_MATRIX_REPOSITORY = Symbol(
  'IComplianceMatrixRepository',
);
export const COMPLIANCE_ITEM_REPOSITORY = Symbol('IComplianceItemRepository');
export const TENDER_REQUIREMENT_REPOSITORY = Symbol(
  'ITenderRequirementRepository',
);
export const EVIDENCE_LINK_REPOSITORY = Symbol('IEvidenceLinkRepository');
export const CONSENT_EVENT_REPOSITORY = Symbol('IConsentEventRepository');
export const DATA_SUBJECT_REQUEST_REPOSITORY = Symbol(
  'IDataSubjectRequestRepository',
);
export const TENDER_ACCESS_REPOSITORY = Symbol('ITenderAccessRepository');
export const RETENTION_ACTION_REPOSITORY = Symbol(
  'IRetentionActionRepository',
);
export const INGESTION_JOB_REPOSITORY = Symbol('IIngestionJobRepository');
export const DPO_CONTACT_REPOSITORY = Symbol('IDpoContactRepository');
