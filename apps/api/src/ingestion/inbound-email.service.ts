import { createHmac, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InboundEmail } from '@prisma/client';
import { IInboundEmailRepository } from '../repositories/interfaces/inbound-email.repository.interface';
import { INBOUND_EMAIL_REPOSITORY } from '../repositories/tokens';
import { DataSubjectService } from '../pdpl/data-subject.service';
import { AuditService } from '../audit/audit.service';

const MAX_BODY_BYTES = 16 * 1024; // 16KB cap on persisted body

export interface InboundEmailPayload {
  /** Mailgun shape: timestamp (unix seconds, string) + token + signature.
   *  We accept any provider as long as the operator wires their own
   *  HMAC compatible with verifySignature(). */
  timestamp: string;
  token: string;
  signature: string;
  messageId: string;
  from: string;
  to: string;
  subject?: string;
  bodyPlain: string;
}

export interface InboundEmailResult {
  status: 'routed' | 'unrouted' | 'duplicate' | 'rejected';
  rowId?: string;
  messageId: string;
  routedAction?: string;
  routedEntityId?: string;
  rejectionReason?: string;
}

/**
 * Inbound-email transport. Verifies a Mailgun-style HMAC against
 * EMAIL_INBOUND_SIGNING_KEY, routes by To-address prefix, and
 * persists every (verified) delivery to InboundEmail for idempotency
 * + ops visibility.
 *
 * Routing rules:
 *   dsr+<orgId>@<host>  → DataSubjectService.createRequest(access,
 *                         subjectEmail=from)
 *   Anything else        → status='unrouted' (visible in admin
 *                         inbox) — operator can manually triage.
 */
@Injectable()
export class InboundEmailService {
  private readonly log = new Logger(InboundEmailService.name);

  constructor(
    @Inject(INBOUND_EMAIL_REPOSITORY)
    private readonly repo: IInboundEmailRepository,
    private readonly dsr: DataSubjectService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Pure HMAC verifier — Mailgun: HMAC-SHA256(timestamp + token) with
   * the signing key, hex-encoded. timingSafeEqual to avoid leaking
   * comparison time. Rejects if the signing key is unset to fail
   * closed in production; in test mode callers pass a known key.
   */
  static verifySignature(
    timestamp: string,
    token: string,
    signature: string,
    signingKey: string,
  ): boolean {
    if (!signingKey) return false;
    const expected = createHmac('sha256', signingKey)
      .update(timestamp + token)
      .digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  async receive(
    payload: InboundEmailPayload,
    signingKey: string = process.env.EMAIL_INBOUND_SIGNING_KEY ?? '',
  ): Promise<InboundEmailResult> {
    if (
      !InboundEmailService.verifySignature(
        payload.timestamp,
        payload.token,
        payload.signature,
        signingKey,
      )
    ) {
      throw new ForbiddenException('invalid signature');
    }
    if (!payload.messageId || !payload.from || !payload.to) {
      throw new BadRequestException('messageId, from, to are required');
    }
    // Idempotency: same Message-Id replays no-op.
    const existing = await this.repo.findByMessageId(payload.messageId);
    if (existing) {
      this.log.log(
        `duplicate inbound email messageId=${payload.messageId} (rowId=${existing.id})`,
      );
      return {
        status: 'duplicate',
        rowId: existing.id,
        messageId: existing.messageId,
        routedAction: existing.routedAction ?? undefined,
        routedEntityId: existing.routedEntityId ?? undefined,
      };
    }

    const body = (payload.bodyPlain ?? '').slice(0, MAX_BODY_BYTES);
    const routed = await this.tryRoute(payload, body);
    const row = await this.repo.create({
      messageId: payload.messageId,
      organizationId: routed.organizationId ?? null,
      fromAddress: payload.from,
      toAddress: payload.to,
      subject: payload.subject ?? null,
      body,
      status: routed.status,
      routedAction: routed.routedAction ?? null,
      routedEntityType: routed.routedEntityType ?? null,
      routedEntityId: routed.routedEntityId ?? null,
      rejectionReason: routed.rejectionReason ?? null,
    });
    if (routed.organizationId) {
      await this.audit.record({
        action: 'inbound_email.received',
        entityType: 'InboundEmail',
        entityId: row.id,
        userId: null,
        organizationId: routed.organizationId,
        details: {
          from: payload.from,
          to: payload.to,
          status: routed.status,
          routedAction: routed.routedAction,
        },
      });
    }
    return {
      status: routed.status,
      rowId: row.id,
      messageId: row.messageId,
      routedAction: routed.routedAction,
      routedEntityId: routed.routedEntityId,
      rejectionReason: routed.rejectionReason,
    };
  }

  recent(organizationId: string, limit?: number): Promise<InboundEmail[]> {
    return this.repo.findRecent(organizationId, limit);
  }

  private async tryRoute(
    payload: InboundEmailPayload,
    body: string,
  ): Promise<{
    status: 'routed' | 'unrouted';
    organizationId?: string;
    routedAction?: string;
    routedEntityType?: string;
    routedEntityId?: string;
    rejectionReason?: string;
  }> {
    const orgId = this.parseRecipient(payload.to, 'dsr');
    if (orgId) {
      try {
        const req = await this.dsr.createRequest(
          orgId,
          'access',
          payload.from.toLowerCase(),
          null,
          `inbound email: ${payload.subject ?? '(no subject)'} — body excerpt: ${body.slice(0, 280)}`,
        );
        return {
          status: 'routed',
          organizationId: orgId,
          routedAction: 'data_subject.access.requested',
          routedEntityType: 'DataSubjectRequest',
          routedEntityId: req.id,
        };
      } catch (err) {
        this.log.warn(
          `failed to route dsr+${orgId}@: ${(err as Error).message}`,
        );
        return {
          status: 'unrouted',
          organizationId: orgId,
          rejectionReason: `routing-failed: ${(err as Error).message}`,
        };
      }
    }
    return { status: 'unrouted' };
  }

  /**
   * Returns the orgId captured by `<prefix>+<orgId>@<host>` or null
   * when the pattern doesn't match. Tolerates display-name email
   * forms like `Name <prefix+org@host>` by extracting the angle-
   * bracketed address first.
   */
  private parseRecipient(toAddress: string, prefix: string): string | null {
    const angleMatch = /<([^>]+)>/.exec(toAddress);
    const addr = (angleMatch ? angleMatch[1] : toAddress).trim().toLowerCase();
    const pattern = new RegExp(`^${prefix}\\+([^@]+)@`);
    const match = pattern.exec(addr);
    return match ? match[1] : null;
  }
}
