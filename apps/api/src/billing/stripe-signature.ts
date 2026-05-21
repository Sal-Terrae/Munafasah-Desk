import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify a Stripe webhook signature without depending on the
 * stripe npm package. Stripe's documented scheme:
 *   Stripe-Signature: t=<unix-ts>,v1=<hex-hmac>,v0=<legacy>
 *   signedPayload = `${timestamp}.${rawBody}`
 *   expected = HMAC-SHA256(secret, signedPayload).hex()
 *
 * Returns false on any parse / mismatch / out-of-window failure.
 * Caller passes `now` so tests are deterministic.
 *
 * https://stripe.com/docs/webhooks#verify-manually
 */
export function verifyStripeSignature(opts: {
  rawBody: string;
  header: string;
  secret: string;
  toleranceSeconds?: number;
  now?: number;
}): boolean {
  if (!opts.secret) return false;
  const parsed = parseHeader(opts.header);
  if (!parsed.timestamp || parsed.v1.length === 0) return false;
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const tolerance = opts.toleranceSeconds ?? 5 * 60;
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;
  const expected = createHmac('sha256', opts.secret)
    .update(`${parsed.timestamp}.${opts.rawBody}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  for (const candidate of parsed.v1) {
    const cBuf = Buffer.from(candidate, 'hex');
    if (cBuf.length !== expectedBuf.length) continue;
    try {
      if (timingSafeEqual(cBuf, expectedBuf)) return true;
    } catch {
      /* keep iterating */
    }
  }
  return false;
}

interface ParsedHeader {
  timestamp: number;
  v1: string[];
}

function parseHeader(header: string): ParsedHeader {
  const result: ParsedHeader = { timestamp: 0, v1: [] };
  if (!header) return result;
  for (const part of header.split(',')) {
    const [k, v] = part.trim().split('=');
    if (!k || !v) continue;
    if (k === 't') {
      const ts = Number(v);
      if (Number.isFinite(ts)) result.timestamp = ts;
    } else if (k === 'v1') {
      result.v1.push(v);
    }
  }
  return result;
}
