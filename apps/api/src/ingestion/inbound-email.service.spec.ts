import { createHmac } from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { InboundEmailService } from './inbound-email.service';
import { FakeInboundEmailRepository } from '../repositories/fake/fake-inbound-email.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';
import { FakeDataSubjectRequestRepository } from '../repositories/fake/fake-data-subject-request.repository';
import { FakeUserRepository } from '../repositories/fake/fake-user.repository';
import { FakeConsentEventRepository } from '../repositories/fake/fake-consent-event.repository';
import { AuditService } from '../audit/audit.service';
import { DataSubjectService } from '../pdpl/data-subject.service';

const SIGN_KEY = 'test-signing-key';

function sign(timestamp: string, token: string): string {
  return createHmac('sha256', SIGN_KEY).update(timestamp + token).digest('hex');
}

function makeSvc() {
  const inboundRepo = new FakeInboundEmailRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  const dsrRepo = new FakeDataSubjectRequestRepository();
  const userRepo = new FakeUserRepository();
  const consentRepo = new FakeConsentEventRepository();
  // DataSubjectService signature:
  // (requests, users, auditRepo, consents, audit)
  const dsr = new DataSubjectService(
    dsrRepo,
    userRepo,
    auditRepo,
    consentRepo,
    audit,
  );
  const svc = new InboundEmailService(inboundRepo, dsr, audit);
  return { svc, inboundRepo, auditRepo, dsrRepo };
}

const okPayload = (overrides: Partial<{ to: string; messageId: string }> = {}) => {
  const timestamp = '1716240000';
  const token = 'tok-xyz';
  return {
    timestamp,
    token,
    signature: sign(timestamp, token),
    messageId: overrides.messageId ?? '<msg-1@local>',
    from: 'sara@example.com',
    to: overrides.to ?? 'dsr+org-1@bidready.local',
    subject: 'Please send me my data',
    bodyPlain: 'I want a copy of my personal data.',
  };
};

describe('InboundEmailService.verifySignature', () => {
  it('returns true for matching signature', () => {
    expect(
      InboundEmailService.verifySignature(
        '1',
        'tok',
        sign('1', 'tok'),
        SIGN_KEY,
      ),
    ).toBe(true);
  });

  it('returns false for mismatched signature', () => {
    expect(
      InboundEmailService.verifySignature(
        '1',
        'tok',
        sign('1', 'tok2'),
        SIGN_KEY,
      ),
    ).toBe(false);
  });

  it('returns false when signing key is empty', () => {
    expect(InboundEmailService.verifySignature('1', 'tok', 'abc', '')).toBe(
      false,
    );
  });

  it('returns false on length mismatch without throwing', () => {
    expect(
      InboundEmailService.verifySignature('1', 'tok', 'deadbeef', SIGN_KEY),
    ).toBe(false);
  });
});

describe('InboundEmailService.receive', () => {
  it('rejects with 403 on invalid signature', async () => {
    const { svc } = makeSvc();
    const payload = { ...okPayload(), signature: 'badbad' };
    await expect(svc.receive(payload, SIGN_KEY)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('routes dsr+<orgId>@host to DataSubjectService.createRequest', async () => {
    const { svc, dsrRepo, auditRepo } = makeSvc();
    const r = await svc.receive(okPayload(), SIGN_KEY);
    expect(r.status).toBe('routed');
    expect(r.routedAction).toBe('data_subject.access.requested');
    expect(r.routedEntityId).toBeDefined();
    const dsrRows = Array.from(
      (dsrRepo as unknown as {
        records: Map<string, { type: string; subjectEmail: string }>;
      }).records.values(),
    );
    expect(dsrRows[0].subjectEmail).toBe('sara@example.com');
    expect(dsrRows[0].type).toBe('access');
    const audits = Array.from(
      (auditRepo as unknown as { records: Map<string, { action: string }> })
        .records.values(),
    );
    expect(audits.some((a) => a.action === 'inbound_email.received')).toBe(
      true,
    );
  });

  it('marks unknown To-prefix as unrouted (and still persists)', async () => {
    const { svc, inboundRepo } = makeSvc();
    const r = await svc.receive(
      okPayload({ to: 'random@bidready.local', messageId: '<msg-2@local>' }),
      SIGN_KEY,
    );
    expect(r.status).toBe('unrouted');
    expect(r.routedAction).toBeUndefined();
    const row = await inboundRepo.findByMessageId('<msg-2@local>');
    expect(row?.status).toBe('unrouted');
    expect(row?.organizationId).toBeNull();
  });

  it('is idempotent on duplicate Message-Id', async () => {
    const { svc } = makeSvc();
    const r1 = await svc.receive(okPayload(), SIGN_KEY);
    const r2 = await svc.receive(okPayload(), SIGN_KEY);
    expect(r1.status).toBe('routed');
    expect(r2.status).toBe('duplicate');
    expect(r2.rowId).toBe(r1.rowId);
  });

  it('handles display-name To header like "Name <dsr+org-1@host>"', async () => {
    const { svc } = makeSvc();
    const r = await svc.receive(
      okPayload({
        to: 'BidReady DSR <dsr+org-1@bidready.local>',
        messageId: '<msg-3@local>',
      }),
      SIGN_KEY,
    );
    expect(r.status).toBe('routed');
  });

  it('truncates very long bodies', async () => {
    const { svc, inboundRepo } = makeSvc();
    const huge = 'x'.repeat(20_000);
    await svc.receive(
      {
        ...okPayload({ messageId: '<msg-big@local>' }),
        bodyPlain: huge,
      },
      SIGN_KEY,
    );
    const row = await inboundRepo.findByMessageId('<msg-big@local>');
    expect(row).not.toBeNull();
    expect((row!.body.length)).toBeLessThanOrEqual(16 * 1024);
  });
});
