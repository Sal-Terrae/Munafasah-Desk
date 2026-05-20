import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientDocument, RetentionAction } from '@prisma/client';
import { RetentionActionPrismaRepository } from '../repositories/prisma/retention-action.prisma.repository';
import { IRetentionActionRepository } from '../repositories/interfaces/retention-action.repository.interface';
import { ClientDocumentPrismaRepository } from '../repositories/prisma/client-document.prisma.repository';
import { IClientDocumentRepository } from '../repositories/interfaces/client-document.repository.interface';
import { AuditService } from '../audit/audit.service';
import { RetentionService } from './retention.service';
import {
  RetentionActionStatus,
  RetentionActionType,
} from '../repositories/types';

@Injectable()
export class RetentionActionPersistenceService {
  constructor(
    @Inject(RetentionActionPrismaRepository)
    private readonly repo: IRetentionActionRepository,
    @Inject(ClientDocumentPrismaRepository)
    private readonly documents: IClientDocumentRepository,
    private readonly policy: RetentionService,
    private readonly audit: AuditService,
  ) {}

  async request(
    organizationId: string,
    documentId: string,
    action: RetentionActionType,
    reason: string,
    requestedBy: string,
  ): Promise<RetentionAction> {
    if (!reason.trim()) {
      throw new BadRequestException('reason required');
    }
    // Tenant guard — non-existent or cross-tenant doc → NotFound.
    const doc = await this.documents.findById(documentId, organizationId);
    if (!doc) throw new NotFoundException('Document not found');
    const row = await this.repo.create({
      organizationId,
      documentId,
      action,
      reason: reason.trim(),
      requestedBy,
    });
    await this.audit.record({
      action: `retention.${action}.requested`,
      entityType: 'RetentionAction',
      entityId: row.id,
      userId: requestedBy,
      organizationId,
      details: { documentId, reason: row.reason },
    });
    return row;
  }

  async approve(
    id: string,
    organizationId: string,
    approver: string,
  ): Promise<RetentionAction> {
    const row = await this.get(id, organizationId);
    this.assertPending(row);
    this.assertApproverDiffersFromRequestor(row, approver);
    const updated = await this.repo.update(id, organizationId, {
      status: 'approved',
      decidedBy: approver,
      decidedAt: new Date(),
    });
    await this.audit.record({
      action: 'retention.approved',
      entityType: 'RetentionAction',
      entityId: id,
      userId: approver,
      organizationId,
      details: { documentId: row.documentId },
    });
    return updated;
  }

  async deny(
    id: string,
    organizationId: string,
    approver: string,
  ): Promise<RetentionAction> {
    const row = await this.get(id, organizationId);
    this.assertPending(row);
    const updated = await this.repo.update(id, organizationId, {
      status: 'denied',
      decidedBy: approver,
      decidedAt: new Date(),
    });
    await this.audit.record({
      action: 'retention.denied',
      entityType: 'RetentionAction',
      entityId: id,
      userId: approver,
      organizationId,
      details: { documentId: row.documentId },
    });
    return updated;
  }

  list(
    organizationId: string,
    status?: RetentionActionStatus,
  ): Promise<RetentionAction[]> {
    return this.repo.findAll(organizationId, status);
  }

  async get(
    id: string,
    organizationId: string,
  ): Promise<RetentionAction> {
    const row = await this.repo.findById(id, organizationId);
    if (!row) throw new NotFoundException('RetentionAction not found');
    return row;
  }

  /**
   * Sweep step — used both by the daily scheduler and by manual
   * trigger. For every document in the org whose retention policy
   * has elapsed AND that doesn't already have a non-final
   * RetentionAction in flight, create a pending destroy request.
   */
  async sweep(
    organizationId: string,
    triggeredBy: string,
    now: Date = new Date(),
  ): Promise<{ docsScanned: number; created: number }> {
    const docs = await this.documents.findAll(organizationId);
    let created = 0;
    for (const doc of docs) {
      const decision = this.policy.evaluate(
        this.toRetentionInputs(doc),
        now,
      );
      if (decision.action !== 'eligible-for-destruction') {
        continue;
      }
      const existing = await this.repo.findForDocument(
        doc.id,
        organizationId,
      );
      const inflight = existing.some(
        (r) => r.status === 'pending' || r.status === 'approved',
      );
      if (inflight) continue;
      await this.request(
        organizationId,
        doc.id,
        'destroy',
        `auto-sweep: ${decision.reason}`,
        triggeredBy,
      );
      created++;
    }
    return { docsScanned: docs.length, created };
  }

  private toRetentionInputs(doc: ClientDocument): {
    state: string;
    expiresAt: Date | null;
    retentionPolicyEndsAt?: Date | null;
  } {
    return {
      state: doc.state,
      expiresAt: doc.expiresAt,
      // Future: per-org retention policy tables. For now use expiresAt as
      // the policy end for destruction eligibility.
      retentionPolicyEndsAt: doc.expiresAt,
    };
  }

  private assertPending(row: RetentionAction): void {
    if (row.status !== 'pending') {
      throw new BadRequestException(
        `action not pending (status=${row.status})`,
      );
    }
  }

  private assertApproverDiffersFromRequestor(
    row: RetentionAction,
    approver: string,
  ): void {
    if (row.requestedBy === approver) {
      throw new BadRequestException(
        'approver must differ from requestor (separation of duties)',
      );
    }
  }
}
