import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditEvent } from '@prisma/client';
import { IAuditEventRepository } from '../interfaces/audit-event.repository.interface';
import { CreateAuditEventData } from '../types';

@Injectable()
export class FakeAuditEventRepository
  implements IAuditEventRepository
{
  // Internal storage is append-only. Exposed only through create + the
  // append-only anonymisation (PDPL right of erasure).
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

  async findForUser(
    userId: string,
    organizationId: string,
  ): Promise<AuditEvent[]> {
    return Array.from(this.records.values()).filter(
      (e) => e.userId === userId && e.organizationId === organizationId,
    );
  }

  async findRecent(
    organizationId: string,
    limit: number,
  ): Promise<AuditEvent[]> {
    return Array.from(this.records.values())
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, Math.max(0, Math.min(limit, 500)));
  }

  async anonymiseUser(
    userId: string,
    organizationId: string,
  ): Promise<number> {
    let count = 0;
    for (const e of this.records.values()) {
      if (e.userId === userId && e.organizationId === organizationId) {
        e.userId = null;
        count++;
      }
    }
    return count;
  }
}
