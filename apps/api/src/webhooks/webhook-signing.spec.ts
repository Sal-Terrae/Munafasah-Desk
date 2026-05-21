import {
  buildHeaders,
  generateWebhookSecret,
  signWebhookBody,
  verifyWebhookSignature,
} from './webhook-signing';

describe('webhook-signing', () => {
  const SECRET = 'unit-test-secret';
  const BODY = JSON.stringify({ ok: true, n: 1 });

  it('signs deterministically for same inputs', () => {
    const a = signWebhookBody(SECRET, BODY, 1716240000);
    const b = signWebhookBody(SECRET, BODY, 1716240000);
    expect(a).toBe(b);
    expect(a.startsWith('sha256=')).toBe(true);
  });

  it('produces different signatures for different bodies', () => {
    const a = signWebhookBody(SECRET, BODY, 1716240000);
    const b = signWebhookBody(SECRET, JSON.stringify({ ok: false }), 1716240000);
    expect(a).not.toBe(b);
  });

  it('produces different signatures for different timestamps', () => {
    const a = signWebhookBody(SECRET, BODY, 1);
    const b = signWebhookBody(SECRET, BODY, 2);
    expect(a).not.toBe(b);
  });

  it('verify accepts a signature it produced', () => {
    const sig = signWebhookBody(SECRET, BODY, 1716240000);
    expect(verifyWebhookSignature(SECRET, BODY, 1716240000, sig)).toBe(true);
  });

  it('verify rejects wrong secret', () => {
    const sig = signWebhookBody(SECRET, BODY, 1716240000);
    expect(
      verifyWebhookSignature('other-secret', BODY, 1716240000, sig),
    ).toBe(false);
  });

  it('verify rejects tampered body', () => {
    const sig = signWebhookBody(SECRET, BODY, 1716240000);
    expect(
      verifyWebhookSignature(SECRET, BODY + ' ', 1716240000, sig),
    ).toBe(false);
  });

  it('verify rejects missing sha256= prefix', () => {
    const sig = signWebhookBody(SECRET, BODY, 1).slice('sha256='.length);
    expect(verifyWebhookSignature(SECRET, BODY, 1, sig)).toBe(false);
  });

  it('buildHeaders includes all required headers', () => {
    const headers = buildHeaders({
      secret: SECRET,
      body: BODY,
      eventType: 'ticket.created',
      deliveryId: 'd-1',
      now: 1716240000,
    });
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Bidready-Timestamp']).toBe('1716240000');
    expect(headers['X-Bidready-Event']).toBe('ticket.created');
    expect(headers['Idempotency-Key']).toBe('d-1');
    expect(
      verifyWebhookSignature(
        SECRET,
        BODY,
        1716240000,
        headers['X-Bidready-Signature'],
      ),
    ).toBe(true);
  });

  it('generateWebhookSecret returns a 64-char hex string (32 bytes)', () => {
    const s = generateWebhookSecret();
    expect(s).toMatch(/^[a-f0-9]{64}$/);
    expect(s).not.toBe(generateWebhookSecret());
  });
});
