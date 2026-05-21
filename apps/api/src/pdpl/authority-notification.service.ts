import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DpoContactService } from './dpo-contact.service';
import { IncidentService } from './incident.service';
import { AuditService } from '../audit/audit.service';
import { NotificationDispatcher } from '../providers/notifications/notification-dispatcher.service';

export interface AuthorityNotificationResult {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  delivered: boolean;
  externalId?: string;
  error?: string;
  driver: 'smtp' | 'none';
}

/**
 * PDPL-Art. 20 authority notification dispatcher.
 *
 * Composes the canonical payload from DpoContactService (which writes
 * the durable "intent" audit row) and forwards it via the email
 * channel registered with the NotificationDispatcher (real SMTP when
 * NOTIFICATION_SMTP_ENABLED, console-only otherwise). Writes a second
 * audit row capturing dispatch outcome so failed sends are traceable.
 *
 * Never throws on send failure — the regulator-evidence audit row
 * exists regardless, and an operator can retry from the manual
 * endpoint. Hard failures only on missing prerequisites (incident
 * not found, severity below threshold, no DpoContact).
 */
@Injectable()
export class AuthorityNotificationService {
  private readonly log = new Logger(AuthorityNotificationService.name);

  constructor(
    private readonly dpo: DpoContactService,
    private readonly incidents: IncidentService,
    private readonly audit: AuditService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async notifyForIncident(
    organizationId: string,
    incidentId: string,
    triggeredBy: string,
  ): Promise<AuthorityNotificationResult> {
    const incident = this.incidents.find(incidentId);
    if (!incident) throw new NotFoundException('incident not found');
    if (!this.incidents.requiresAuthorityNotification(incident)) {
      throw new BadRequestException(
        'incident does not require authority notification (severity/timing)',
      );
    }
    // Build canonical payload + write the durable intent audit row.
    const payload = await this.dpo.notifyAuthority(
      organizationId,
      incident,
      triggeredBy,
    );
    const canDispatch = this.dispatcher
      .availableChannels()
      .includes('email');
    if (!canDispatch) {
      this.log.warn(
        `org=${organizationId} incident=${incidentId} no SMTP driver — audit-only delivery`,
      );
      return { ...payload, driver: 'none' };
    }
    try {
      const sent = await this.dispatcher.send('email', {
        organizationId,
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        payload: payload.cc ? { cc: payload.cc } : undefined,
      });
      await this.audit.record({
        action: 'incident.authority_notified.dispatched',
        entityType: 'Incident',
        entityId: incident.id,
        userId: triggeredBy,
        organizationId,
        details: {
          to: payload.to,
          driver: 'smtp',
          externalId: sent.externalId ?? null,
        },
      });
      return {
        ...payload,
        delivered: true,
        externalId: sent.externalId,
        driver: 'smtp',
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      await this.audit.record({
        action: 'incident.authority_notified.dispatch_failed',
        entityType: 'Incident',
        entityId: incident.id,
        userId: triggeredBy,
        organizationId,
        details: { to: payload.to, error: errorMessage },
      });
      return {
        ...payload,
        delivered: false,
        error: errorMessage,
        driver: 'smtp',
      };
    }
  }
}
