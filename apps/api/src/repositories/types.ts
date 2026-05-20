import { UserRole, Prisma } from '@prisma/client';

export interface CreateOrganizationData {
  name: string;
}

export interface UpdateOrganizationData {
  name?: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  password?: string | null;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface CreateClientCompanyData {
  name: string;
  organizationId: string;
}

export interface UpdateClientCompanyData {
  name?: string;
}

export interface CreateTenderData {
  title: string;
  organizationId: string;
  clientCompanyId: string;
  source?: string;
  status?: string;
}

export interface UpdateTenderData {
  title?: string;
  status?: string;
  source?: string;
}

export interface CreateClientDocumentData {
  filename: string;
  clientCompanyId: string;
  organizationId: string;
  documentType?: string;
  sensitivity?: string;
  state?: string;
  expiresAt?: Date | null;
}

export interface UpdateClientDocumentData {
  filename?: string;
  documentType?: string;
  sensitivity?: string;
  state?: string;
  expiresAt?: Date | null;
}

export interface CreateAuditEventData {
  action: string;
  entityType: string;
  entityId: string;
  // userId is nullable so erased users' audit rows can be retained
  // with the FK pseudonymised (P11 PDPL fix).
  userId: string | null;
  organizationId: string;
  details?: Prisma.JsonValue;
}

// ---------- P10 entities ----------

export interface CreateComplianceMatrixData {
  tenderId: string;
  organizationId: string;
  version: number;
  status?: string;
  generatedAt?: Date;
}

export interface UpdateComplianceMatrixData {
  status?: string;
}

export interface CreateComplianceItemData {
  matrixId: string;
  organizationId: string;
  requirementId: string;
  requirementText: string;
  category: string;
  owner: string;
  risk: string;
  status: string;
  dueDate?: Date | null;
}

export interface UpdateComplianceItemData {
  owner?: string;
  status?: string;
  risk?: string;
  dueDate?: Date | null;
}

export interface CreateTenderRequirementData {
  tenderId: string;
  organizationId: string;
  category: string;
  text: string;
  risk?: string;
  owner?: string | null;
  source?: string;
}

export interface UpdateTenderRequirementData {
  category?: string;
  text?: string;
  risk?: string;
  owner?: string | null;
}

export interface CreateEvidenceLinkData {
  organizationId: string;
  complianceItemId: string;
  documentId: string;
  note?: string | null;
}

export interface UpdateEvidenceLinkData {
  note?: string | null;
}

// ---------- P11 PDPL entities ----------

export type ConsentState = 'granted' | 'withdrawn';

export interface CreateConsentEventData {
  organizationId: string;
  subjectEmail: string;
  subjectUserId?: string | null;
  purpose: string;
  state: ConsentState;
  source?: string;
  recordedBy?: string | null;
  details?: Prisma.JsonValue;
}

export type DataSubjectRequestType =
  | 'access'
  | 'erasure'
  | 'rectification';

export type DataSubjectRequestStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'completed';

export interface CreateDataSubjectRequestData {
  organizationId: string;
  type: DataSubjectRequestType;
  subjectEmail: string;
  requestedBy?: string | null;
  notes?: string | null;
}

export interface UpdateDataSubjectRequestData {
  status?: DataSubjectRequestStatus;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  payload?: Prisma.JsonValue;
}

export type TenderAccessRole =
  | 'Owner'
  | 'Editor'
  | 'Reviewer'
  | 'Viewer';

export interface CreateTenderAccessData {
  organizationId: string;
  userId: string;
  tenderId: string;
  role: TenderAccessRole;
  grantedBy?: string | null;
}

export interface UpdateTenderAccessData {
  role?: TenderAccessRole;
}

export type RetentionActionType = 'destroy' | 'archive';

export type RetentionActionStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'executed';

export interface CreateRetentionActionData {
  organizationId: string;
  documentId: string;
  action: RetentionActionType;
  reason: string;
  requestedBy: string;
}

export interface UpdateRetentionActionData {
  status?: RetentionActionStatus;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  executedAt?: Date | null;
}

// ---------- P12b ingestion ----------

export type IngestionKind = 'etimad' | 'upload' | 'email' | 'link';
export type IngestionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface CreateIngestionJobData {
  organizationId: string;
  kind: IngestionKind;
  payload: Prisma.JsonValue;
  createdBy?: string | null;
}

export interface UpdateIngestionJobData {
  status?: IngestionStatus;
  result?: Prisma.JsonValue;
  errorMessage?: string | null;
  claimedBy?: string | null;
  claimedAt?: Date | null;
  completedAt?: Date | null;
  attempts?: number;
}

// ---------- P12c DPO contact ----------

export interface UpsertDpoContactData {
  organizationId: string;
  name: string;
  email: string;
  phone?: string | null;
  authorityEmail: string;
  retentionPolicyDays?: number;
  updatedBy?: string | null;
}
