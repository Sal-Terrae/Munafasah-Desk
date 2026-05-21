import { createHmac } from 'crypto';
import { verifyStripeSignature } from './stripe-signature';

const SECRET = 'whsec_test';
const BODY = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.created' });

function buildHeader(ts: number, body: string, secret: string): string {
  const hex = createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex');
  return `t=${ts},v1=${hex}`;
}

describe('verifyStripeSignature', () => {
  it('accepts a valid signature within the tolerance window', () => {
    const ts = 1716240000;
    const header = buildHeader(ts, BODY, SECRET);
    expect(
      verifyStripeSignature({
        rawBody: BODY,
        header,
        secret: SECRET,
        now: ts,
      }),
    ).toBe(true);
  });

  it('rejects when secret is empty', () => {
    const header = buildHeader(1, BODY, 'whsec_other');
    expect(
      verifyStripeSignature({
        rawBody: BODY,
        header,
        secret: '',
        now: 1,
      }),
    ).toBe(false);
  });

  it('rejects on tampered body', () => {
    const ts = 1;
    const header = buildHeader(ts, BODY, SECRET);
    expect(
      verifyStripeSignature({
        rawBody: BODY + ' ',
        header,
        secret: SECRET,
        now: ts,
      }),
    ).toBe(false);
  });

  it('rejects when timestamp drifts beyond tolerance', () => {
    const ts = 1716240000;
    const header = buildHeader(ts, BODY, SECRET);
    expect(
      verifyStripeSignature({
        rawBody: BODY,
        header,
        secret: SECRET,
        now: ts + 10 * 60, // 10 min drift
      }),
    ).toBe(false);
  });

  it('accepts when one of multiple v1 entries matches', () => {
    const ts = 1;
    const goodSig = createHmac('sha256', SECRET)
      .update(`${ts}.${BODY}`)
      .digest('hex');
    const header = `t=${ts},v1=deadbeef,v1=${goodSig}`;
    expect(
      verifyStripeSignature({
        rawBody: BODY,
        header,
        secret: SECRET,
        now: ts,
      }),
    ).toBe(true);
  });

  it('returns false on malformed header', () => {
    expect(
      verifyStripeSignature({
        rawBody: BODY,
        header: 'not-a-stripe-header',
        secret: SECRET,
        now: 1,
      }),
    ).toBe(false);
    expect(
      verifyStripeSignature({
        rawBody: BODY,
        header: '',
        secret: SECRET,
        now: 1,
      }),
    ).toBe(false);
  });
});
