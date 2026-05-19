import { AuditEvent } from '@prisma/client';
import { CreateAuditEventData } from '../types';

export interface IAuditEventRepository {
  create(data: CreateAuditEventData): Promise<AuditEvent>;
}
