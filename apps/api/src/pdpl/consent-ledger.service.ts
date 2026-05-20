import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConsentEvent } from '@prisma/client';
import { IConsentEventRepository } from '../repositories/interfaces/consent-event.repository.interface';
import { AuditService } from '../audit/audit.service';
import { ConsentState } from '../repositories/types';
import { CONSENT_EVENT_REPOSITORY } from '../repositories/tokens';

export interface RecordConsentInput {
  subjectEmail: string;
  subjectUserId?: string | null;
  purpose: string;
  state: ConsentState;
  source?: string;
  recordedBy?: string | null;
  details?: Record<string, unknown>;
}

@Injectable()
export class ConsentLedgerService {
  constructor(
    @Inject(CONSENT_EVENT_REPOSITORY)
    private readonly repo: IConsentEventRepository,
    private readonly audit: AuditService,
  ) {}

  async record(
    organizationId: string,
    input: RecordConsentInput,
  ): Promise<ConsentEvent> {
    if (!input.subjectEmail || !input.subjectEmail.includes('@')) {
      throw new BadRequestException('subjectEmail required');
    }
    if (!input.purpose) {
      throw new BadRequestException('purpose required');
    }
    if (input.state !== 'granted' && input.state !== 'withdrawn') {
      throw new BadRequestException('state must be granted|withdrawn');
    }
    const ev = await this.repo.create({
      organizationId,
      subjectEmail: input.subjectEmail,
      subjectUserId: input.subjectUserId ?? null,
      purpose: input.purpose,
      state: input.state,
      source: input.source ?? 'api',
      recordedBy: input.recordedBy ?? null,
      details: input.details as never,
    });
    await this.audit.record({
      action: `consent.${input.state}`,
      entityType: 'ConsentEvent',
      entityId: ev.id,
      userId: input.recordedBy ?? null,
      organizationId,
      details: {
        subjectEmail: input.subjectEmail,
        purpose: input.purpose,
        source: input.source ?? 'api',
      },
    });
    return ev;
  }

  listForSubject(
    organizationId: string,
    subjectEmail: string,
  ): Promise<ConsentEvent[]> {
    return this.repo.findAllForSubject(subjectEmail, organizationId);
  }

  /**
   * Effective state for a (subject, purpose) pair = most-recent event.
   * Returns `null` when no event has been recorded — caller decides if
   * "no record" should default to denied (it should, for marketing
   * channels like WhatsApp reminders).
   */
  async currentState(
    organizationId: string,
    subjectEmail: string,
    purpose: string,
  ): Promise<ConsentState | null> {
    const latest = await this.repo.findCurrent(
      subjectEmail,
      purpose,
      organizationId,
    );
    if (!latest) return null;
    return latest.state as ConsentState;
  }

  /**
   * Convenience for downstream callers: "may I send for this purpose?"
   * Default deny — only `granted` returns true.
   */
  async hasActiveConsent(
    organizationId: string,
    subjectEmail: string,
    purpose: string,
  ): Promise<boolean> {
    return (
      (await this.currentState(organizationId, subjectEmail, purpose)) ===
      'granted'
    );
  }
}
