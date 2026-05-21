import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { FakeWebhookSubscriptionRepository } from '../repositories/fake/fake-webhook-subscription.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';
import { AuditService } from '../audit/audit.service';

function makeSvc() {
  const repo = new FakeWebhookSubscriptionRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  const svc = new WebhookSubscriptionService(repo, audit);
  return { svc, repo, auditRepo };
}

const baseInput = {
  url: 'https://hooks.example.com/in',
  eventTypes: ['ticket.created'],
};

describe('WebhookSubscriptionService', () => {
  it('creates with a generated secret returned exactly once', async () => {
    const { svc } = makeSvc();
    const r = await svc.create('org-1', 'admin-1', baseInput);
    expect(r.secret).toMatch(/^[a-f0-9]{64}$/);
    expect(r.subscription.url).toBe(baseInput.url);
    // The stripped view has no `secret` field.
    expect((r.subscription as unknown as { secret?: string }).secret).toBeUndefined();
  });

  it('rejects bad URLs + bad event-type names', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.create('org-1', 'admin-1', { url: 'not-a-url', eventTypes: ['a.b'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('org-1', 'admin-1', {
        url: 'ftp://x.test/',
        eventTypes: ['a.b'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('org-1', 'admin-1', { url: 'https://x.test', eventTypes: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('org-1', 'admin-1', {
        url: 'https://x.test',
        eventTypes: ['BadName'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks private/loopback hosts only in production', async () => {
    const { svc } = makeSvc();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(
        svc.create('org-1', 'admin-1', {
          url: 'https://localhost:3000/in',
          eventTypes: ['ticket.created'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      process.env.NODE_ENV = prev;
    }
    // Allowed in non-prod (test mode):
    const r = await svc.create('org-1', 'admin-1', {
      url: 'https://localhost:3000/in',
      eventTypes: ['ticket.created'],
    });
    expect(r.subscription.url).toBe('https://localhost:3000/in');
  });

  it('normalises and dedupes eventTypes alphabetically', async () => {
    const { svc } = makeSvc();
    const r = await svc.create('org-1', 'admin-1', {
      url: 'https://x.test/in',
      eventTypes: ['z.b', 'a.x', 'a.x', 'm.k'],
    });
    expect(r.subscription.eventTypes).toEqual(['a.x', 'm.k', 'z.b']);
  });

  it('denies cross-tenant get/update/rotate/delete', async () => {
    const { svc } = makeSvc();
    const created = await svc.create('org-1', 'admin-1', baseInput);
    const id = created.subscription.id;
    await expect(svc.get(id, 'org-2')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.update(id, 'org-2', 'admin-1', { active: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.rotateSecret(id, 'org-2', 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.remove(id, 'org-2', 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    // Still alive for the rightful owner.
    expect((await svc.get(id, 'org-1')).id).toBe(id);
  });

  it('rotateSecret returns a NEW secret different from the old one', async () => {
    const { svc, repo } = makeSvc();
    const created = await svc.create('org-1', 'admin-1', baseInput);
    const id = created.subscription.id;
    const before = (await repo.findById(id, 'org-1'))!.secret;
    const rotated = await svc.rotateSecret(id, 'org-1', 'admin-1');
    expect(rotated.secret).not.toBe(before);
    expect((await repo.findById(id, 'org-1'))!.secret).toBe(rotated.secret);
  });

  it('list strips secret from every row', async () => {
    const { svc } = makeSvc();
    await svc.create('org-1', 'admin-1', baseInput);
    await svc.create('org-1', 'admin-1', {
      ...baseInput,
      url: 'https://other.test/in',
    });
    const rows = await svc.list('org-1');
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect((r as unknown as { secret?: string }).secret).toBeUndefined();
    }
  });
});
