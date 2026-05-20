import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'audit:metadata';

export type EntityIdSource = 'param' | 'body' | 'response' | 'principal';

export interface AuditMetadata {
  /** Stable action verb, e.g. 'tender.update_status'. */
  action: string;
  /** Entity type label, e.g. 'Tender' or 'ComplianceItem'. */
  entityType: string;
  /** Where to read the entity id from. Default: 'response' (response.id). */
  entityIdFrom?: EntityIdSource;
  /** Key to read. Default: 'id' for response/principal, mandatory for param/body. */
  entityIdKey?: string;
  /**
   * Body keys to include in the audit `details` JSON. Values that look
   * like secrets (matched on key name) are redacted by the structured
   * logger; the audit details are captured *after* request validation
   * so they are already shaped DTOs.
   */
  detailsFrom?: string[];
}

/**
 * Mark an endpoint as audited. The global AuditInterceptor writes one
 * AuditEvent **after** the request handler completes successfully.
 */
export const Audited = (meta: AuditMetadata): MethodDecorator =>
  SetMetadata(AUDITED_KEY, meta);
