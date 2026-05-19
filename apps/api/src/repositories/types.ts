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
  tenderId: string;
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
