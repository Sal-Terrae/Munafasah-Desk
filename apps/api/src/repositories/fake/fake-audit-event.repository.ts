import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditEvent } from '@prisma/client';
import { IAuditEventRepository } from '../interfaces/audit-event.repository.interface';
import { CreateAuditEventData } from '../types';

@Injectable()
export class FakeAuditEventRepository
  implements IAuditEventRepository
{
  // Internal storage is append-only. Exposed only through create.
  private records = new Map<string, AuditEvent>();

  async create(data: CreateAuditEventData): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: randomUUID(),
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      organizationId: data.organizationId,
      details: data.details ?? null,
      timestamp: new Date(),
    };
    this.records.set(event.id, event);
    return event;
  }
}
