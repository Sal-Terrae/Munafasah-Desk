import { Inject, Injectable, Logger } from '@nestjs/common';
import { WebhookDelivery } from '@prisma/client';
import { IWebhookSubscriptionRepository } from '../repositories/interfaces/webhook-subscription.repository.interface';
import { IWebhookDeliveryRepository } from '../repositories/interfaces/webhook-delivery.repository.interface';
import {
  WEBHOOK_DELIVERY_REPOSITORY,
  WEBHOOK_SUBSCRIPTION_REPOSITORY,
} from '../repositories/tokens';
import { buildHeaders } from './webhook-signing';

export interface WebhookDispatcherDeps {
  /** Override for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Retry policy. */
  maxAttempts?: number;
  backoffBaseMs?: number;
  requestTimeoutMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_BASE_MS = 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fan-out + signed delivery. publish(orgId, eventType, payload):
 *   1. Look up active subscriptions for the event type.
 *   2. Create one WebhookDelivery row per subscription (pending).
 *   3. Try delivery now (best-effort; failures schedule retries).
 *
 * Retries: exponential backoff (1s, 2s, 4s) capped at maxAttempts.
 * Each attempt records attempts++, lastError, responseStatus,
 * lastTriedAt. On success: status='delivered', deliveredAt=now.
 * After maxAttempts exhausted: status='failed'.
 *
 * We do not use the QueueProvider yet — retries use setTimeout to
 * stay simple and not require Redis to be present. If retry volume
 * grows, a follow-up can lift this into BullMQ jobs.
 */
@Injectable()
export class WebhookDispatcher {
  private readonly log = new Logger(WebhookDispatcher.name);
  private readonly doFetch: typeof fetch;
  private readonly maxAttempts: number;
  private readonly backoffBaseMs: number;
  private readonly requestTimeoutMs: number;

  constructor(
    @Inject(WEBHOOK_SUBSCRIPTION_REPOSITORY)
    private readonly subs: IWebhookSubscriptionRepository,
    @Inject(WEBHOOK_DELIVERY_REPOSITORY)
    private readonly deliveries: IWebhookDeliveryRepository,
    deps: WebhookDispatcherDeps = {},
  ) {
    this.doFetch = deps.fetchImpl ?? fetch;
    this.maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.backoffBaseMs = deps.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
    this.requestTimeoutMs =
      deps.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  /**
   * Enqueue + immediately try delivery to every active subscription
   * that has eventType in its eventTypes[] for the org. Returns the
   * created delivery rows (each with its initial post-attempt
   * status — caller can poll for final state).
   */
  async publish(
    organizationId: string,
    eventType: string,
    payload: unknown,
  ): Promise<WebhookDelivery[]> {
    const subscriptions = await this.subs.findActiveForEvent(
      organizationId,
      eventType,
    );
    if (subscriptions.length === 0) return [];
    const created: WebhookDelivery[] = [];
    for (const sub of subscriptions) {
      const delivery = await this.deliveries.create({
        subscriptionId: sub.id,
        organizationId,
        eventType,
        payload,
      });
      const final = await this.attempt(sub.secret, sub.url, delivery);
      created.push(final);
    }
    return created;
  }

  /** Public retry hook for ops dashboards. */
  async retry(
    delivery: WebhookDelivery,
    subscriptionSecret: string,
    subscriptionUrl: string,
  ): Promise<WebhookDelivery> {
    return this.attempt(subscriptionSecret, subscriptionUrl, delivery);
  }

  private async attempt(
    secret: string,
    url: string,
    delivery: WebhookDelivery,
  ): Promise<WebhookDelivery> {
    let current = delivery;
    while (current.attempts < this.maxAttempts) {
      const body = JSON.stringify(current.payload);
      const headers = buildHeaders({
        secret,
        body,
        eventType: current.eventType,
        deliveryId: current.id,
      });
      const attemptNumber = current.attempts + 1;
      try {
        const res = await this.fetchWithTimeout(
          url,
          body,
          headers as unknown as Record<string, string>,
        );
        if (res.ok) {
          current = await this.deliveries.update(current.id, {
            status: 'delivered',
            attempts: attemptNumber,
            responseStatus: res.status,
            lastTriedAt: new Date(),
            deliveredAt: new Date(),
            lastError: null,
          });
          this.log.log(
            `delivered subscription=${delivery.subscriptionId} event=${delivery.eventType} attempt=${attemptNumber}`,
          );
          return current;
        }
        const errText = `HTTP ${res.status}`;
        current = await this.deliveries.update(current.id, {
          attempts: attemptNumber,
          lastError: errText,
          responseStatus: res.status,
          lastTriedAt: new Date(),
        });
      } catch (err) {
        const errText =
          err instanceof Error ? err.message : String(err);
        current = await this.deliveries.update(current.id, {
          attempts: attemptNumber,
          lastError: errText,
          responseStatus: null,
          lastTriedAt: new Date(),
        });
      }
      if (attemptNumber >= this.maxAttempts) break;
      await this.sleep(this.backoffBaseMs * Math.pow(2, attemptNumber - 1));
    }
    // Exhausted attempts → mark failed.
    return this.deliveries.update(current.id, { status: 'failed' });
  }

  private async fetchWithTimeout(
    url: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(
      () => ctrl.abort(),
      this.requestTimeoutMs,
    );
    try {
      return await this.doFetch(url, {
        method: 'POST',
        headers,
        body,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms).unref?.());
  }
}
