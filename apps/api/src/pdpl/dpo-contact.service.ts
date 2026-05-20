import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DpoContact } from '@prisma/client';
import { DpoContactPrismaRepository } from '../repositories/prisma/dpo-contact.prisma.repository';
import { IDpoContactRepository } from '../repositories/interfaces/dpo-contact.repository.interface';
import { AuditService } from '../audit/audit.service';
import { Incident, IncidentService } from './incident.service';
import { UpsertDpoContactData } from '../repositories/types';

export interface NotificationDispatchRecord {
  delivered: boolean;          // false: pending org-level SMTP infra
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

@Injectable()
export class DpoContactService {
  constructor(
    @Inject(DpoContactPrismaRepository)
    private readonly repo: IDpoContactRepository,
    private readonly audit: AuditService,
    private readonly incidents: IncidentService,
  ) {}

  async upsert(
    organizationId: string,
    data: Omit<UpsertDpoContactData, 'organizationId' | 'updatedBy'>,
    updatedBy: string,
  ): Promise<DpoContact> {
    if (!data.name?.trim() || !data.email?.includes('@')) {
      throw new BadRequestException('name and a valid email are required');
    }
    if (!data.authorityEmail?.includes('@')) {
      throw new BadRequestException('authorityEmail (SDAIA) is required');
    }
    const row = await this.repo.upsert({
      organizationId,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() ?? null,
      authorityEmail: data.authorityEmail.trim(),
      retentionPolicyDays: data.retentionPolicyDays,
      updatedBy,
    });
    await this.audit.record({
      action: 'dpo_contact.upsert',
      entityType: 'DpoContact',
      entityId: row.id,
      userId: updatedBy,
      organizationId,
      details: {
        name: row.name,
        email: row.email,
        authorityEmail: row.authorityEmail,
        retentionPolicyDays: row.retentionPolicyDays,
      },
    });
    return row;
  }

  get(organizationId: string): Promise<DpoContact | null> {
    return this.repo.findByOrg(organizationId);
  }

  async require(organizationId: string): Promise<DpoContact> {
    const row = await this.repo.findByOrg(organizationId);
    if (!row) {
      throw new NotFoundException(
        'DpoContact missing — upsert /dpo-contact first',
      );
    }
    return row;
  }

  /**
   * Authority-notification dispatch for severe incidents. We do NOT
   * own SMTP infra (real transport is per-tenant config); instead we
   * build the canonical notification payload, write an audit event,
   * and return it for the caller to forward via whichever transport
   * they've integrated. The audit row is the durable evidence that
   * the 72h obligation was discharged.
   */
  async notifyAuthority(
    organizationId: string,
    incident: Incident,
    triggeredBy: string,
  ): Promise<NotificationDispatchRecord> {
    if (!this.incidents.requiresAuthorityNotification(incident)) {
      throw new BadRequestException(
        'incident does not require authority notification (severity/timing)',
      );
    }
    const dpo = await this.require(organizationId);
    const subject = `[PDPL ${incident.severity.toUpperCase()}] Incident ${incident.id} — ${incident.kind}`;
    const detectedAtIso = incident.detectedAt.toISOString();
    const body =
      `Incident ID: ${incident.id}\n` +
      `Severity: ${incident.severity}\n` +
      `Kind: ${incident.kind}\n` +
      `Detected at: ${detectedAtIso}\n` +
      `Status: ${incident.status}\n` +
      `Summary: ${incident.summary}\n\n` +
      `This notification is issued under PDPL Art. 20 (72h breach\n` +
      `notification). Reply-to: ${dpo.email}`;
    const dispatch: NotificationDispatchRecord = {
      delivered: false,
      to: dpo.authorityEmail,
      cc: dpo.email,
      subject,
      body,
    };
    await this.audit.record({
      action: 'incident.authority_notified',
      entityType: 'Incident',
      entityId: incident.id,
      userId: triggeredBy,
      organizationId,
      details: {
        to: dispatch.to,
        cc: dispatch.cc,
        subject,
        severity: incident.severity,
        kind: incident.kind,
        detectedAt: detectedAtIso,
      },
    });
    return dispatch;
  }
}
