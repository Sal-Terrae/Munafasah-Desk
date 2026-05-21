import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface WebhookSignatureHeaders {
  'X-Bidready-Timestamp': string;
  'X-Bidready-Signature': string;
  'X-Bidready-Event': string;
  'Idempotency-Key': string;
  'Content-Type': string;
}

/**
 * Sign a webhook delivery. Body is the canonical JSON string the
 * client will receive. Signature scheme:
 *   X-Bidready-Signature: sha256=<hex>
 *   where <hex> = HMAC-SHA256(secret, `${timestamp}.${body}`)
 *
 * Receivers should:
 *   1. Reject if abs(now - timestamp) > 5 minutes
 *   2. Recompute the HMAC and compare with timingSafeEqual
 *   3. Dedupe by Idempotency-Key
 */
export function signWebhookBody(
  secret: string,
  body: string,
  timestamp: number,
): string {
  const hex = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `sha256=${hex}`;
}

export function buildHeaders(opts: {
  secret: string;
  body: string;
  eventType: string;
  deliveryId: string;
  now?: number;
}): WebhookSignatureHeaders {
  const ts = opts.now ?? Math.floor(Date.now() / 1000);
  return {
    'Content-Type': 'application/json',
    'X-Bidready-Timestamp': String(ts),
    'X-Bidready-Signature': signWebhookBody(opts.secret, opts.body, ts),
    'X-Bidready-Event': opts.eventType,
    'Idempotency-Key': opts.deliveryId,
  };
}

/** Verify on the receiver side — exported so test code (or a future
 *  loopback receiver) can use the same logic that produced the sig. */
export function verifyWebhookSignature(
  secret: string,
  body: string,
  timestamp: number,
  signatureHeader: string,
): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const given = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  const expected = Buffer.from(
    createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex'),
    'hex',
  );
  if (given.length !== expected.length) return false;
  try {
    return timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}

/** Generate a fresh subscription secret. 32 random bytes → hex. */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}
