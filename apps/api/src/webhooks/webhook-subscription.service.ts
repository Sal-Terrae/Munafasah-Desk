import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WebhookSubscription } from '@prisma/client';
import {
  CreateWebhookSubscriptionData,
  IWebhookSubscriptionRepository,
  UpdateWebhookSubscriptionData,
} from '../repositories/interfaces/webhook-subscription.repository.interface';
import { WEBHOOK_SUBSCRIPTION_REPOSITORY } from '../repositories/tokens';
import { AuditService } from '../audit/audit.service';
import { generateWebhookSecret } from './webhook-signing';

export interface WebhookSubscriptionWithSecret {
  subscription: Omit<WebhookSubscription, 'secret'>;
  /** Returned ONLY on create + rotateSecret — never on subsequent reads. */
  secret: string;
}

/**
 * CRUD over WebhookSubscription. The secret is sensitive: it is
 * generated server-side, returned on create + rotateSecret only,
 * and stripped from every read path. Owner-only enforced at the
 * controller layer.
 */
@Injectable()
export class WebhookSubscriptionService {
  constructor(
    @Inject(WEBHOOK_SUBSCRIPTION_REPOSITORY)
    private readonly repo: IWebhookSubscriptionRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    createdBy: string,
    input: Omit<
      CreateWebhookSubscriptionData,
      'organizationId' | 'createdBy' | 'secret'
    >,
  ): Promise<WebhookSubscriptionWithSecret> {
    this.validate(input.url, input.eventTypes);
    const secret = generateWebhookSecret();
    const row = await this.repo.create({
      organizationId,
      createdBy,
      url: input.url.trim(),
      secret,
      eventTypes: this.normalizeEventTypes(input.eventTypes),
      active: input.active ?? true,
      description: input.description?.trim() || null,
    });
    await this.audit.record({
      action: 'webhook.subscription.created',
      entityType: 'WebhookSubscription',
      entityId: row.id,
      userId: createdBy,
      organizationId,
      details: { url: row.url, eventTypes: row.eventTypes },
    });
    return { subscription: this.strip(row), secret };
  }

  async list(
    organizationId: string,
  ): Promise<Array<Omit<WebhookSubscription, 'secret'>>> {
    const rows = await this.repo.findAll(organizationId);
    return rows.map((r) => this.strip(r));
  }

  async get(
    id: string,
    organizationId: string,
  ): Promise<Omit<WebhookSubscription, 'secret'>> {
    const row = await this.repo.findById(id, organizationId);
    if (!row) throw new NotFoundException('WebhookSubscription not found');
    return this.strip(row);
  }

  async update(
    id: string,
    organizationId: string,
    updatedBy: string,
    input: Omit<UpdateWebhookSubscriptionData, 'secret'>,
  ): Promise<Omit<WebhookSubscription, 'secret'>> {
    await this.get(id, organizationId); // tenant guard + 404
    if (input.url !== undefined) this.validateUrl(input.url);
    if (input.eventTypes !== undefined) {
      this.validateEventTypes(input.eventTypes);
    }
    const row = await this.repo.update(id, organizationId, {
      ...(input.url !== undefined && { url: input.url.trim() }),
      ...(input.eventTypes !== undefined && {
        eventTypes: this.normalizeEventTypes(input.eventTypes),
      }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
    });
    await this.audit.record({
      action: 'webhook.subscription.updated',
      entityType: 'WebhookSubscription',
      entityId: id,
      userId: updatedBy,
      organizationId,
      details: { url: row.url, eventTypes: row.eventTypes, active: row.active },
    });
    return this.strip(row);
  }

  async rotateSecret(
    id: string,
    organizationId: string,
    rotatedBy: string,
  ): Promise<WebhookSubscriptionWithSecret> {
    await this.get(id, organizationId); // tenant guard + 404
    const secret = generateWebhookSecret();
    const row = await this.repo.update(id, organizationId, { secret });
    await this.audit.record({
      action: 'webhook.subscription.secret_rotated',
      entityType: 'WebhookSubscription',
      entityId: id,
      userId: rotatedBy,
      organizationId,
      details: { url: row.url },
    });
    return { subscription: this.strip(row), secret };
  }

  async remove(
    id: string,
    organizationId: string,
    removedBy: string,
  ): Promise<void> {
    await this.get(id, organizationId); // tenant guard + 404
    await this.repo.delete(id, organizationId);
    await this.audit.record({
      action: 'webhook.subscription.deleted',
      entityType: 'WebhookSubscription',
      entityId: id,
      userId: removedBy,
      organizationId,
      details: {},
    });
  }

  private validate(url: string, eventTypes: string[]): void {
    this.validateUrl(url);
    this.validateEventTypes(eventTypes);
  }

  private validateUrl(url: string): void {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new BadRequestException('url must be a valid URL');
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      throw new BadRequestException('url must be http(s)');
    }
    // SSRF defense in depth — block obvious local/private targets in
    // production. Operator may need to whitelist via env later.
    if (process.env.NODE_ENV === 'production') {
      const host = u.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.local') ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.')
      ) {
        throw new BadRequestException(
          'url must not target a private/loopback host',
        );
      }
    }
  }

  private validateEventTypes(eventTypes: string[]): void {
    if (!eventTypes.length) {
      throw new BadRequestException('eventTypes must be non-empty');
    }
    for (const t of eventTypes) {
      if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(t)) {
        throw new BadRequestException(
          `eventType '${t}' must look like 'resource.verb'`,
        );
      }
    }
  }

  private normalizeEventTypes(eventTypes: string[]): string[] {
    // Dedupe + stable sort so the persisted array is canonical.
    return Array.from(new Set(eventTypes.map((t) => t.trim()))).sort();
  }

  private strip(
    row: WebhookSubscription,
  ): Omit<WebhookSubscription, 'secret'> {
    const { secret: _secret, ...rest } = row;
    return rest;
  }
}
