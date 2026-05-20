import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DataSubjectService } from './data-subject.service';
import { AuditService } from '../audit/audit.service';
import { FakeUserRepository } from '../repositories/fake/fake-user.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';
import { FakeConsentEventRepository } from '../repositories/fake/fake-consent-event.repository';
import { FakeDataSubjectRequestRepository } from '../repositories/fake/fake-data-subject-request.repository';

const ORG = 'org-1';

async function makeSvc() {
  const users = new FakeUserRepository();
  const auditRepo = new FakeAuditEventRepository();
  const consents = new FakeConsentEventRepository();
  const requests = new FakeDataSubjectRequestRepository();
  const audit = new AuditService(auditRepo);
  const svc = new DataSubjectService(
    requests,
    users,
    auditRepo,
    consents,
    audit,
  );
  const user = await users.create({
    email: 'subject@acme.test',
    name: 'Subject',
    role: UserRole.Reviewer,
    organizationId: ORG,
  });
  // Seed some audit + consent rows for the subject.
  await audit.record({
    action: 'tender.view',
    entityType: 'Tender',
    entityId: 't-1',
    userId: user.id,
    organizationId: ORG,
  });
  await consents.create({
    organizationId: ORG,
    subjectEmail: user.email,
    purpose: 'whatsapp_reminders',
    state: 'granted',
  });
  return { svc, users, auditRepo, consents, requests, audit, user };
}

describe('DataSubjectService', () => {
  it('creates a pending request and emits an audit event', async () => {
    const { svc, requests, auditRepo } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'access',
      'subject@acme.test',
      'admin-1',
    );
    expect(req.status).toBe('pending');
    expect(req.type).toBe('access');
    const all = (
      auditRepo as unknown as { records: Map<string, { action: string }> }
    ).records;
    expect(
      Array.from(all.values()).some(
        (r) => r.action === 'data_subject.access.requested',
      ),
    ).toBe(true);
  });

  it('rejects requests with malformed subjectEmail', async () => {
    const { svc } = await makeSvc();
    await expect(
      svc.createRequest(ORG, 'access', 'not-an-email', 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('approve requires non-pending → throws', async () => {
    const { svc } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'access',
      'subject@acme.test',
      'admin-1',
    );
    await svc.approve(req.id, ORG, 'admin-2');
    await expect(svc.approve(req.id, ORG, 'admin-2')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('approve refuses when approver = requestor (separation of duties)', async () => {
    const { svc } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'access',
      'subject@acme.test',
      'admin-1',
    );
    await expect(svc.approve(req.id, ORG, 'admin-1')).rejects.toThrow(
      /differ from requestor/,
    );
  });

  it('execute access builds a snapshot and attaches it to payload', async () => {
    const { svc, requests } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'access',
      'subject@acme.test',
      'admin-1',
    );
    await svc.approve(req.id, ORG, 'admin-2');
    const { snapshot, request: completed } = await svc.execute(
      req.id,
      ORG,
      'admin-2',
    );
    expect(completed.status).toBe('completed');
    expect(snapshot).toBeDefined();
    expect(snapshot!.user?.email).toBe('subject@acme.test');
    expect(snapshot!.auditEvents.length).toBeGreaterThan(0);
    expect(snapshot!.consentEvents.length).toBeGreaterThan(0);
    const fromRepo = await requests.findById(req.id, ORG);
    expect(fromRepo!.payload).not.toBeNull();
  });

  it('execute erasure pseudonymises user + nullifies audit FK + anonymises consent', async () => {
    const { svc, users, auditRepo, consents, user } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'erasure',
      'subject@acme.test',
      'admin-1',
    );
    await svc.approve(req.id, ORG, 'admin-2');
    const { erasure } = await svc.execute(req.id, ORG, 'admin-2');
    expect(erasure!.userAnonymised).toBe(true);
    expect(erasure!.auditAnonymised).toBeGreaterThanOrEqual(1);
    expect(erasure!.consentAnonymised).toBeGreaterThanOrEqual(1);
    // The user row still exists but with pseudonymised values
    const stale = await users.findByEmail('subject@acme.test');
    expect(stale).toBeNull();
    const refetched = await users.findById(user.id, ORG);
    expect(refetched!.email).toMatch(/^\[erased-/);
    expect(refetched!.name).toBe('[erased]');
    expect(refetched!.password).toBeNull();
    // Audit events for this user no longer return on findForUser
    expect(await auditRepo.findForUser(user.id, ORG)).toHaveLength(0);
    // Consent rows have pseudonymised subjectEmail
    const consentForOriginal = await consents.findAllForSubject(
      'subject@acme.test',
      ORG,
    );
    expect(consentForOriginal).toHaveLength(0);
  });

  it('execute refuses when request is not approved', async () => {
    const { svc } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'access',
      'subject@acme.test',
      'admin-1',
    );
    await expect(svc.execute(req.id, ORG, 'admin-2')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('get returns NotFound for cross-tenant requests', async () => {
    const { svc } = await makeSvc();
    const req = await svc.createRequest(
      ORG,
      'access',
      'subject@acme.test',
      'admin-1',
    );
    await expect(svc.get(req.id, 'other-org')).rejects.toThrow(
      NotFoundException,
    );
  });
});
