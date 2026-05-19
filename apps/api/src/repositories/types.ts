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
  userId: string;
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
