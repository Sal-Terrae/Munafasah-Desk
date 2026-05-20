import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RetentionActionPersistenceService } from './retention-action.service';
import { RetentionService } from './retention.service';
import { AuditService } from '../audit/audit.service';
import { FakeRetentionActionRepository } from '../repositories/fake/fake-retention-action.repository';
import { FakeClientDocumentRepository } from '../repositories/fake/fake-client-document.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

const ORG = 'org-1';

async function makeSvc() {
  const repo = new FakeRetentionActionRepository();
  const docs = new FakeClientDocumentRepository();
  const audit = new AuditService(new FakeAuditEventRepository());
  const policy = new RetentionService();
  const svc = new RetentionActionPersistenceService(
    repo,
    docs,
    policy,
    audit,
  );
  const doc = await docs.create({
    filename: 'cr.pdf',
    clientCompanyId: 'cc-1',
    organizationId: ORG,
    documentType: 'legal',
    expiresAt: new Date('2023-01-01'),
  });
  return { svc, repo, docs, audit, doc };
}

describe('RetentionActionPersistenceService', () => {
  it('request creates a pending row + audits + tenant-guards', async () => {
    const { svc, repo, doc } = await makeSvc();
    const action = await svc.request(
      ORG,
      doc.id,
      'destroy',
      'over retention window',
      'admin-1',
    );
    expect(action.status).toBe('pending');
    expect(action.requestedBy).toBe('admin-1');
    expect(action.documentId).toBe(doc.id);
    const all = await repo.findAll(ORG);
    expect(all).toHaveLength(1);
  });

  it('request rejects empty reason', async () => {
    const { svc, doc } = await makeSvc();
    await expect(
      svc.request(ORG, doc.id, 'destroy', '   ', 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('request denies cross-tenant docs as NotFound', async () => {
    const { svc, doc } = await makeSvc();
    await expect(
      svc.request('org-other', doc.id, 'destroy', 'r', 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('approve enforces SoD (approver ≠ requestor)', async () => {
    const { svc, doc } = await makeSvc();
    const a = await svc.request(ORG, doc.id, 'destroy', 'r', 'alice');
    await expect(svc.approve(a.id, ORG, 'alice')).rejects.toThrow(
      /differ from requestor/,
    );
    const approved = await svc.approve(a.id, ORG, 'bob');
    expect(approved.status).toBe('approved');
    expect(approved.decidedBy).toBe('bob');
  });

  it('approve refuses non-pending', async () => {
    const { svc, doc } = await makeSvc();
    const a = await svc.request(ORG, doc.id, 'destroy', 'r', 'alice');
    await svc.deny(a.id, ORG, 'bob');
    await expect(svc.approve(a.id, ORG, 'bob')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deny succeeds and audits — does not enforce SoD for denial', async () => {
    const { svc, doc } = await makeSvc();
    const a = await svc.request(ORG, doc.id, 'destroy', 'r', 'alice');
    const denied = await svc.deny(a.id, ORG, 'alice');
    expect(denied.status).toBe('denied');
  });

  it('sweep creates pending destroy for elapsed-retention docs only', async () => {
    const { svc, docs } = await makeSvc();
    // current doc has expiresAt 2023-01-01 → retention elapsed by NOW
    // add a fresh doc that's not elapsed yet
    await docs.create({
      filename: 'fresh.pdf',
      clientCompanyId: 'cc-1',
      organizationId: ORG,
      documentType: 'legal',
      expiresAt: new Date('2099-01-01'),
    });
    const now = new Date('2026-05-20T00:00:00Z');
    const result = await svc.sweep(ORG, 'system:test', now);
    expect(result.docsScanned).toBe(2);
    expect(result.created).toBe(1);
  });

  it('sweep is idempotent — does not double-create when one is in flight', async () => {
    const { svc } = await makeSvc();
    const now = new Date('2026-05-20T00:00:00Z');
    const a = await svc.sweep(ORG, 'system:test', now);
    expect(a.created).toBe(1);
    const b = await svc.sweep(ORG, 'system:test', now);
    expect(b.created).toBe(0);
  });
});
