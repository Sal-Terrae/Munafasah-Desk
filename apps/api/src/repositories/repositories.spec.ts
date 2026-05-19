import { FakeOrganizationRepository } from './fake/fake-organization.repository';
import { FakeUserRepository } from './fake/fake-user.repository';
import { FakeClientCompanyRepository } from './fake/fake-client-company.repository';
import { FakeTenderRepository } from './fake/fake-tender.repository';
import { FakeClientDocumentRepository } from './fake/fake-client-document.repository';
import { FakeAuditEventRepository } from './fake/fake-audit-event.repository';
import { UserRole } from '@prisma/client';
import {
  CreateUserData,
  CreateClientCompanyData,
  CreateTenderData,
  CreateClientDocumentData,
  CreateAuditEventData,
} from './types';

describe('Organization repository (non‑tenant)', () => {
  let orgRepo: FakeOrganizationRepository;

  beforeEach(() => {
    orgRepo = new FakeOrganizationRepository();
  });

  it('findAll returns empty initially', async () => {
    expect(await orgRepo.findAll()).toEqual([]);
  });

  it('create and findById', async () => {
    const org = await orgRepo.create({ name: 'Org1' });
    const found = await orgRepo.findById(org.id);
    expect(found).toEqual(org);
  });

  it('update modifies name and updates timestamp', async () => {
    const org = await orgRepo.create({ name: 'A' });
    const updated = await orgRepo.update(org.id, { name: 'B' });
    expect(updated.name).toBe('B');
    const refetched = await orgRepo.findById(org.id);
    expect(refetched!.name).toBe('B');
    expect(refetched!.updatedAt).not.toEqual(org.updatedAt);
  });

  it('delete removes an organization', async () => {
    const org = await orgRepo.create({ name: 'C' });
    const result = await orgRepo.delete(org.id);
    expect(result).toBe(true);
    expect(await orgRepo.findById(org.id)).toBeNull();
  });
});

describe('User repository tenant scoping', () => {
  let userRepo: FakeUserRepository;
  let orgRepo: FakeOrganizationRepository;
  let orgA: any;
  let orgB: any;

  beforeEach(async () => {
    userRepo = new FakeUserRepository();
    orgRepo = new FakeOrganizationRepository();
    orgA = await orgRepo.create({ name: 'Tenant-A' });
    orgB = await orgRepo.create({ name: 'Tenant-B' });
  });

  const userA: CreateUserData = {
    email: 'a@a.com',
    name: 'Alice',
    role: UserRole.Owner,
    organizationId: '', // set later
  };
  const userB: CreateUserData = {
    email: 'b@b.com',
    name: 'Bob',
    role: UserRole.BidManager,
    organizationId: '',
  };

  it('findAll returns only users for the given organisation', async () => {
    userA.organizationId = orgA.id;
    userB.organizationId = orgB.id;
    await userRepo.create(userA);
    await userRepo.create(userB);

    const usersA = await userRepo.findAll(orgA.id);
    expect(usersA).toHaveLength(1);
    expect(usersA[0].email).toBe('a@a.com');

    const usersB = await userRepo.findAll(orgB.id);
    expect(usersB).toHaveLength(1);
    expect(usersB[0].email).toBe('b@b.com');
  });

  it('findById cannot retrieve a record from a different tenant', async () => {
    userA.organizationId = orgA.id;
    const user = await userRepo.create(userA);
    const notFound = await userRepo.findById(user.id, orgB.id);
    expect(notFound).toBeNull();
  });

  it('update refuses to change a record outside the tenant', async () => {
    userA.organizationId = orgA.id;
    const user = await userRepo.create(userA);
    await expect(
      userRepo.update(user.id, orgB.id, { name: 'Hacked' }),
    ).rejects.toThrow();
  });

  it('delete returns false when called with a different tenant', async () => {
    userA.organizationId = orgA.id;
    const user = await userRepo.create(userA);
    const deleted = await userRepo.delete(user.id, orgB.id);
    expect(deleted).toBe(false);
    // Confirm the record still belongs to orgA
    const still = await userRepo.findById(user.id, orgA.id);
    expect(still).not.toBeNull();
  });
});

describe('ClientCompany repository tenant scoping', () => {
  let repo: FakeClientCompanyRepository;
  let orgRepo: FakeOrganizationRepository;
  let orgA: any;
  let orgB: any;

  beforeEach(async () => {
    repo = new FakeClientCompanyRepository();
    orgRepo = new FakeOrganizationRepository();
    orgA = await orgRepo.create({ name: 'A' });
    orgB = await orgRepo.create({ name: 'B' });
  });

  it('cross‑tenant findById returns null', async () => {
    const company = await repo.create({ name: 'C1', organizationId: orgA.id });
    const notFound = await repo.findById(company.id, orgB.id);
    expect(notFound).toBeNull();
  });

  it('cross‑tenant delete returns false', async () => {
    const company = await repo.create({ name: 'C2', organizationId: orgA.id });
    const deleted = await repo.delete(company.id, orgB.id);
    expect(deleted).toBe(false);
    expect(await repo.findById(company.id, orgA.id)).not.toBeNull();
  });
});

describe('Tender repository tenant scoping', () => {
  let tenderRepo: FakeTenderRepository;
  let clientCompRepo: FakeClientCompanyRepository;
  let orgRepo: FakeOrganizationRepository;
  let orgA: any;
  let orgB: any;
  let compA: any;

  beforeEach(async () => {
    tenderRepo = new FakeTenderRepository();
    clientCompRepo = new FakeClientCompanyRepository();
    orgRepo = new FakeOrganizationRepository();
    orgA = await orgRepo.create({ name: 'A' });
    orgB = await orgRepo.create({ name: 'B' });
    compA = await clientCompRepo.create({ name: 'CC', organizationId: orgA.id });
  });

  it('findAll returns only tenders for the given organisation', async () => {
    await tenderRepo.create({
      title: 'T1',
      organizationId: orgA.id,
      clientCompanyId: compA.id,
    });
    await tenderRepo.create({
      title: 'T2',
      organizationId: orgB.id,
      clientCompanyId: '',
    });

    const tendersA = await tenderRepo.findAll(orgA.id);
    expect(tendersA).toHaveLength(1);
    expect(tendersA[0].title).toBe('T1');
  });

  it('cross‑tenant findById returns null', async () => {
    const tender = await tenderRepo.create({
      title: 'X',
      organizationId: orgA.id,
      clientCompanyId: compA.id,
    });
    const notFound = await tenderRepo.findById(tender.id, orgB.id);
    expect(notFound).toBeNull();
  });

  it('cross‑tenant update throws', async () => {
    const tender = await tenderRepo.create({
      title: 'Y',
      organizationId: orgA.id,
      clientCompanyId: compA.id,
    });
    await expect(
      tenderRepo.update(tender.id, orgB.id, { title: 'Hacked' }),
    ).rejects.toThrow();
  });

  it('cross‑tenant delete returns false', async () => {
    const tender = await tenderRepo.create({
      title: 'Z',
      organizationId: orgA.id,
      clientCompanyId: compA.id,
    });
    const deleted = await tenderRepo.delete(tender.id, orgB.id);
    expect(deleted).toBe(false);
    expect(await tenderRepo.findById(tender.id, orgA.id)).not.toBeNull();
  });
});

describe('ClientDocument repository tenant scoping', () => {
  let docRepo: FakeClientDocumentRepository;
  let clientCompRepo: FakeClientCompanyRepository;
  let orgRepo: FakeOrganizationRepository;
  let orgA: any;
  let orgB: any;
  let comp: any;

  beforeEach(async () => {
    docRepo = new FakeClientDocumentRepository();
    clientCompRepo = new FakeClientCompanyRepository();
    orgRepo = new FakeOrganizationRepository();
    orgA = await orgRepo.create({ name: 'A' });
    orgB = await orgRepo.create({ name: 'B' });
    comp = await clientCompRepo.create({ name: 'C', organizationId: orgA.id });
  });

  it('cannot retrieve a document from a different tenant', async () => {
    const doc = await docRepo.create({
      filename: 'd.pdf',
      clientCompanyId: comp.id,
      organizationId: orgA.id,
    });
    const notFound = await docRepo.findById(doc.id, orgB.id);
    expect(notFound).toBeNull();
  });

  it('cross‑tenant delete returns false', async () => {
    const doc = await docRepo.create({
      filename: 'e.pdf',
      clientCompanyId: comp.id,
      organizationId: orgA.id,
    });
    const deleted = await docRepo.delete(doc.id, orgB.id);
    expect(deleted).toBe(false);
    const still = await docRepo.findById(doc.id, orgA.id);
    expect(still).not.toBeNull();
  });
});

describe('AuditEvent repository (append‑only)', () => {
  let auditRepo: FakeAuditEventRepository;

  beforeEach(() => {
    auditRepo = new FakeAuditEventRepository();
  });

  it('create returns an event with the expected fields', async () => {
    const data: CreateAuditEventData = {
      action: 'LOGIN',
      entityType: 'User',
      entityId: 'u1',
      userId: 'usr-1',
      organizationId: 'org-1',
      details: { ip: '127.0.0.1' },
    };
    const event = await auditRepo.create(data);
    expect(event.organizationId).toBe('org-1');
    expect(event.action).toBe('LOGIN');
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});
