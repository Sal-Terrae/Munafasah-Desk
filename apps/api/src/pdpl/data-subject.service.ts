import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEvent,
  ConsentEvent,
  DataSubjectRequest,
  User,
} from '@prisma/client';
import { IUserRepository } from '../repositories/interfaces/user.repository.interface';
import { IAuditEventRepository } from '../repositories/interfaces/audit-event.repository.interface';
import { IConsentEventRepository } from '../repositories/interfaces/consent-event.repository.interface';
import { IDataSubjectRequestRepository } from '../repositories/interfaces/data-subject-request.repository.interface';
import { AuditService } from '../audit/audit.service';
import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
} from '../repositories/types';
import {
  AUDIT_EVENT_REPOSITORY,
  CONSENT_EVENT_REPOSITORY,
  DATA_SUBJECT_REQUEST_REPOSITORY,
  USER_REPOSITORY,
} from '../repositories/tokens';

export interface AccessSnapshot {
  subjectEmail: string;
  user: Pick<
    User,
    'id' | 'email' | 'name' | 'role' | 'organizationId' | 'createdAt'
  > | null;
  auditEvents: AuditEvent[];
  consentEvents: ConsentEvent[];
  previousRequests: DataSubjectRequest[];
  generatedAt: Date;
}

@Injectable()
export class DataSubjectService {
  constructor(
    @Inject(DATA_SUBJECT_REQUEST_REPOSITORY)
    private readonly requests: IDataSubjectRequestRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(AUDIT_EVENT_REPOSITORY)
    private readonly auditRepo: IAuditEventRepository,
    @Inject(CONSENT_EVENT_REPOSITORY)
    private readonly consents: IConsentEventRepository,
    private readonly audit: AuditService,
  ) {}

  async createRequest(
    organizationId: string,
    type: DataSubjectRequestType,
    subjectEmail: string,
    requestedBy: string | null,
    notes?: string | null,
  ): Promise<DataSubjectRequest> {
    if (!subjectEmail || !subjectEmail.includes('@')) {
      throw new BadRequestException('subjectEmail required');
    }
    const req = await this.requests.create({
      organizationId,
      type,
      subjectEmail,
      requestedBy,
      notes: notes ?? null,
    });
    await this.audit.record({
      action: `data_subject.${type}.requested`,
      entityType: 'DataSubjectRequest',
      entityId: req.id,
      userId: requestedBy ?? null,
      organizationId,
      details: { subjectEmail, type },
    });
    return req;
  }

  list(
    organizationId: string,
    status?: DataSubjectRequestStatus,
  ): Promise<DataSubjectRequest[]> {
    return this.requests.findAll(organizationId, status);
  }

  async get(
    id: string,
    organizationId: string,
  ): Promise<DataSubjectRequest> {
    const req = await this.requests.findById(id, organizationId);
    if (!req) throw new NotFoundException('DataSubjectRequest not found');
    return req;
  }

  async approve(
    id: string,
    organizationId: string,
    decidedBy: string,
  ): Promise<DataSubjectRequest> {
    const req = await this.get(id, organizationId);
    this.assertPending(req);
    this.assertApproverDiffersFromRequestor(req, decidedBy);
    const updated = await this.requests.update(id, organizationId, {
      status: 'approved',
      decidedBy,
      decidedAt: new Date(),
    });
    await this.audit.record({
      action: `data_subject.${req.type}.approved`,
      entityType: 'DataSubjectRequest',
      entityId: id,
      userId: decidedBy,
      organizationId,
      details: { subjectEmail: req.subjectEmail, type: req.type },
    });
    return updated;
  }

  async deny(
    id: string,
    organizationId: string,
    decidedBy: string,
    notes?: string,
  ): Promise<DataSubjectRequest> {
    const req = await this.get(id, organizationId);
    this.assertPending(req);
    const updated = await this.requests.update(id, organizationId, {
      status: 'denied',
      decidedBy,
      decidedAt: new Date(),
      ...(notes !== undefined ? { notes } : {}),
    });
    await this.audit.record({
      action: `data_subject.${req.type}.denied`,
      entityType: 'DataSubjectRequest',
      entityId: id,
      userId: decidedBy,
      organizationId,
      details: { subjectEmail: req.subjectEmail, type: req.type },
    });
    return updated;
  }

  /**
   * Execute an approved request:
   * - access: builds + attaches a snapshot
   * - erasure: pseudonymises the User row + audit FKs + consent rows
   * - rectification: marks as completed (the actual rectification value
   *   lives in `notes`/`payload` and is applied by an admin manually,
   *   since auto-rectifying arbitrary fields is risky)
   */
  async execute(
    id: string,
    organizationId: string,
    decidedBy: string,
  ): Promise<{
    request: DataSubjectRequest;
    snapshot?: AccessSnapshot;
    erasure?: {
      auditAnonymised: number;
      consentAnonymised: number;
      userAnonymised: boolean;
    };
  }> {
    const req = await this.get(id, organizationId);
    if (req.status !== 'approved') {
      throw new BadRequestException(
        `request must be approved before execution (got ${req.status})`,
      );
    }
    this.assertApproverDiffersFromRequestor(req, decidedBy);

    if (req.type === 'access') {
      const snapshot = await this.buildAccessSnapshot(
        req.subjectEmail,
        organizationId,
      );
      const updated = await this.requests.update(id, organizationId, {
        status: 'completed',
        completedAt: new Date(),
        payload: snapshot as never,
      });
      await this.audit.record({
        action: 'data_subject.access.executed',
        entityType: 'DataSubjectRequest',
        entityId: id,
        userId: decidedBy,
        organizationId,
        details: {
          subjectEmail: req.subjectEmail,
          rowCounts: {
            audit: snapshot.auditEvents.length,
            consent: snapshot.consentEvents.length,
            previousRequests: snapshot.previousRequests.length,
          },
        },
      });
      return { request: updated, snapshot };
    }

    if (req.type === 'erasure') {
      const result = await this.executeErasure(
        req.subjectEmail,
        organizationId,
      );
      const updated = await this.requests.update(id, organizationId, {
        status: 'completed',
        completedAt: new Date(),
        payload: result as never,
      });
      await this.audit.record({
        action: 'data_subject.erasure.executed',
        entityType: 'DataSubjectRequest',
        entityId: id,
        userId: decidedBy,
        organizationId,
        details: {
          ...result,
          // Don't echo the original email back into audit — it was just erased.
          subjectAnonymised: true,
        },
      });
      return { request: updated, erasure: result };
    }

    // rectification: completed-as-acknowledged; the actual fix is manual.
    const updated = await this.requests.update(id, organizationId, {
      status: 'completed',
      completedAt: new Date(),
    });
    await this.audit.record({
      action: 'data_subject.rectification.executed',
      entityType: 'DataSubjectRequest',
      entityId: id,
      userId: decidedBy,
      organizationId,
      details: { subjectEmail: req.subjectEmail },
    });
    return { request: updated };
  }

  private assertPending(req: DataSubjectRequest): void {
    if (req.status !== 'pending') {
      throw new BadRequestException(
        `request not pending (status=${req.status})`,
      );
    }
  }

  private assertApproverDiffersFromRequestor(
    req: DataSubjectRequest,
    decidedBy: string,
  ): void {
    if (req.requestedBy && req.requestedBy === decidedBy) {
      throw new BadRequestException(
        'approver must differ from requestor (separation of duties)',
      );
    }
  }

  private async buildAccessSnapshot(
    subjectEmail: string,
    organizationId: string,
  ): Promise<AccessSnapshot> {
    const user = await this.users.findByEmail(subjectEmail);
    const auditEvents = user
      ? await this.auditRepo.findForUser(user.id, organizationId)
      : [];
    const consentEvents = await this.consents.findAllForSubject(
      subjectEmail,
      organizationId,
    );
    const previousRequests = await this.requests.findForSubject(
      subjectEmail,
      organizationId,
    );
    return {
      subjectEmail,
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            createdAt: user.createdAt,
          }
        : null,
      auditEvents,
      consentEvents,
      previousRequests,
      generatedAt: new Date(),
    };
  }

  private async executeErasure(
    subjectEmail: string,
    organizationId: string,
  ): Promise<{
    auditAnonymised: number;
    consentAnonymised: number;
    userAnonymised: boolean;
  }> {
    const pseudonymousEmail = `[erased-${randomUUID()}]@erased.local`;
    const user = await this.users.findByEmail(subjectEmail);

    let auditAnonymised = 0;
    let userAnonymised = false;
    if (user) {
      // Order: anonymise audit FK first (SetNull); then consent; finally
      // pseudonymise the User row so a subsequent lookup by original
      // email returns nothing.
      auditAnonymised = await this.auditRepo.anonymiseUser(
        user.id,
        organizationId,
      );
      await this.users.anonymise(user.id, organizationId, pseudonymousEmail);
      userAnonymised = true;
    }

    const consentAnonymised = await this.consents.anonymiseSubject(
      subjectEmail,
      organizationId,
      pseudonymousEmail,
    );

    return { auditAnonymised, consentAnonymised, userAnonymised };
  }
}
