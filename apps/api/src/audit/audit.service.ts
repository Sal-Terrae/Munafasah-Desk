import { Inject, Injectable } from '@nestjs/common';
import { AuditEvent } from '@prisma/client';
import { AuditEventPrismaRepository } from '../repositories/prisma/audit-event.prisma.repository';
import { IAuditEventRepository } from '../repositories/interfaces/audit-event.repository.interface';
import { CreateAuditEventData } from '../repositories/types';

/**
 * Append-only: the ONLY write path is `record` -> repository.create.
 * No update/delete is exposed (PDPL audit-trail integrity).
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(AuditEventPrismaRepository)
    private readonly repo: IAuditEventRepository,
  ) {}

  record(data: CreateAuditEventData): Promise<AuditEvent> {
    return this.repo.create(data);
  }
}
