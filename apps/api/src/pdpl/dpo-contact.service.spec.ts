import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DpoContactService } from './dpo-contact.service';
import { IncidentService } from './incident.service';
import { AuditService } from '../audit/audit.service';
import { FakeDpoContactRepository } from '../repositories/fake/fake-dpo-contact.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

const ORG = 'org-1';

function makeSvc() {
  const repo = new FakeDpoContactRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  const incidents = new IncidentService();
  return {
    svc: new DpoContactService(repo, audit, incidents),
    repo,
    auditRepo,
    incidents,
  };
}

describe('DpoContactService', () => {
  it('upsert creates then updates the single row for the org', async () => {
    const { svc, repo } = makeSvc();
    const a = await svc.upsert(
      ORG,
      {
        name: 'DPO 1',
        email: 'dpo@example.test',
        authorityEmail: 'sdaia@example.test',
      },
      'admin-1',
    );
    expect(a.name).toBe('DPO 1');

    const b = await svc.upsert(
      ORG,
      {
        name: 'DPO 2',
        email: 'dpo@example.test',
        authorityEmail: 'sdaia@example.test',
      },
      'admin-1',
    );
    // Same row id, updated name.
    expect(b.id).toBe(a.id);
    expect(b.name).toBe('DPO 2');

    expect(await repo.findByOrg(ORG)).not.toBeNull();
  });

  it('upsert rejects missing/invalid inputs', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.upsert(ORG, { name: '', email: 'a@b.c', authorityEmail: 'x@y.z' }, 'u'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.upsert(ORG, { name: 'n', email: 'not-an-email', authorityEmail: 'x@y.z' }, 'u'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.upsert(ORG, { name: 'n', email: 'a@b.c', authorityEmail: 'no' }, 'u'),
    ).rejects.toThrow(BadRequestException);
  });

  it('upsert writes an audit event', async () => {
    const { svc, auditRepo } = makeSvc();
    await svc.upsert(
      ORG,
      {
        name: 'DPO',
        email: 'dpo@example.test',
        authorityEmail: 'sdaia@example.test',
      },
      'admin-1',
    );
    const all = (
      auditRepo as unknown as { records: Map<string, { action: string }> }
    ).records;
    expect(
      Array.from(all.values()).some((r) => r.action === 'dpo_contact.upsert'),
    ).toBe(true);
  });

  it('require throws NotFound when no DPO is configured', async () => {
    const { svc } = makeSvc();
    await expect(svc.require(ORG)).rejects.toThrow(NotFoundException);
  });

  it('notifyAuthority builds a canonical payload + audit when an incident is overdue', async () => {
    const { svc, incidents, auditRepo } = makeSvc();
    await svc.upsert(
      ORG,
      {
        name: 'DPO',
        email: 'dpo@example.test',
        authorityEmail: 'sdaia@example.test',
      },
      'admin-1',
    );
    const t0 = new Date('2026-05-20T00:00:00Z');
    const inc = incidents.create('critical', 'data_breach', 'lost laptop', t0);
    // jump > 72h forward with no report — overdue per IncidentService
    const overdueNow = new Date('2026-05-23T08:00:00Z');
    jest.useFakeTimers().setSystemTime(overdueNow);
    try {
      const dispatch = await svc.notifyAuthority(ORG, inc, 'admin-1');
      expect(dispatch.to).toBe('sdaia@example.test');
      expect(dispatch.cc).toBe('dpo@example.test');
      expect(dispatch.subject).toContain('CRITICAL');
      expect(dispatch.body).toContain(inc.id);
      expect(dispatch.delivered).toBe(false); // SMTP transport is org infra
      const audits = Array.from(
        (auditRepo as unknown as { records: Map<string, { action: string }> })
          .records.values(),
      );
      expect(
        audits.some((r) => r.action === 'incident.authority_notified'),
      ).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('notifyAuthority refuses when the 72h clock has NOT elapsed', async () => {
    const { svc, incidents } = makeSvc();
    await svc.upsert(
      ORG,
      {
        name: 'DPO',
        email: 'dpo@example.test',
        authorityEmail: 'sdaia@example.test',
      },
      'admin-1',
    );
    const t0 = new Date('2026-05-20T00:00:00Z');
    const inc = incidents.create('critical', 'data_breach', 'x', t0);
    incidents.report(inc.id, new Date('2026-05-20T10:00:00Z')); // 10h
    await expect(
      svc.notifyAuthority(ORG, inc, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('notifyAuthority refuses when no DPO is configured', async () => {
    const { svc, incidents } = makeSvc();
    const t0 = new Date('2026-05-20T00:00:00Z');
    const inc = incidents.create('critical', 'data_breach', 'x', t0);
    const overdueNow = new Date('2026-05-23T08:00:00Z');
    jest.useFakeTimers().setSystemTime(overdueNow);
    try {
      await expect(svc.notifyAuthority(ORG, inc, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
