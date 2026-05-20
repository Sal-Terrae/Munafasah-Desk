import { AuditEvent } from '@prisma/client';
import { CreateAuditEventData } from '../types';

export interface IAuditEventRepository {
  create(data: CreateAuditEventData): Promise<AuditEvent>;
  /** PDPL data-subject access: events recorded against a user. */
  findForUser(userId: string, organizationId: string): Promise<AuditEvent[]>;
  /**
   * Recent events for an organization (admin viewer). `limit` caps the
   * page size so a careless caller can't pull the entire ledger.
   */
  findRecent(
    organizationId: string,
    limit: number,
  ): Promise<AuditEvent[]>;
  /**
   * PDPL erasure: pseudonymise a user's audit FK so the audit trail
   * is retained but no longer points at the erased user.
   */
  anonymiseUser(userId: string, organizationId: string): Promise<number>;
}
