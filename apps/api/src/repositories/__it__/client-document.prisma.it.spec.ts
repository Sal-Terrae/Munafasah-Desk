import { PrismaService } from '../../prisma.service';
import { ClientDocumentPrismaRepository } from '../prisma/client-document.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('ClientDocument repository (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let repo: ClientDocumentPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    repo = new ClientDocumentPrismaRepository(
      db.prisma as unknown as PrismaService,
    );
  }, 90_000);

  afterAll(async () => {
    if (db) await db.stop();
  });

  beforeEach(async () => {
    await db.truncateAll();
  });

  async function seedOrgAndCompany(orgName = 'Acme', compName = 'BetaCo') {
    const org = await db.prisma.organization.create({
      data: { name: orgName },
    });
    const company = await db.prisma.clientCompany.create({
      data: { name: compName, organizationId: org.id },
    });
    return { org, company };
  }

  it('creates a document parented to ClientCompany (PRD ERD fix)', async () => {
    const { org, company } = await seedOrgAndCompany();
    const doc = await repo.create({
      filename: 'cr.pdf',
      clientCompanyId: company.id,
      organizationId: org.id,
      documentType: 'legal',
    });
    expect(doc.clientCompanyId).toBe(company.id);
    expect(doc.organizationId).toBe(org.id);
    // The schema no longer carries a tender FK on ClientDocument.
    expect(doc as Record<string, unknown>).not.toHaveProperty('tenderId');
  });

  it('findById is tenant-scoped (cross-tenant returns null)', async () => {
    const { org: orgA, company: compA } = await seedOrgAndCompany('A', 'A-Co');
    const orgB = await db.prisma.organization.create({ data: { name: 'B' } });
    const doc = await repo.create({
      filename: 'x.pdf',
      clientCompanyId: compA.id,
      organizationId: orgA.id,
    });
    expect(await repo.findById(doc.id, orgA.id)).not.toBeNull();
    expect(await repo.findById(doc.id, orgB.id)).toBeNull();
  });

  it('the same document is structurally reusable across tenders (PRD goal)', async () => {
    const { org, company } = await seedOrgAndCompany();
    // Two tenders for the same company → one document can serve both.
    const t1 = await db.prisma.tender.create({
      data: {
        title: 'T1',
        organizationId: org.id,
        clientCompanyId: company.id,
      },
    });
    const t2 = await db.prisma.tender.create({
      data: {
        title: 'T2',
        organizationId: org.id,
        clientCompanyId: company.id,
      },
    });
    const doc = await repo.create({
      filename: 'cr.pdf',
      clientCompanyId: company.id,
      organizationId: org.id,
      documentType: 'legal',
    });
    // Delete t1 — doc must NOT be cascaded (it isn't parented to a Tender anymore).
    await db.prisma.tender.delete({ where: { id: t1.id } });
    const still = await repo.findById(doc.id, org.id);
    expect(still).not.toBeNull();
    // t2 still references the same company; doc still findable.
    const t2Refetched = await db.prisma.tender.findUnique({
      where: { id: t2.id },
    });
    expect(t2Refetched).not.toBeNull();
  });

  it('listExpiring-style query returns active expired docs only', async () => {
    const { org, company } = await seedOrgAndCompany();
    const past = new Date('2025-01-01');
    const future = new Date('2999-01-01');
    const soon = await repo.create({
      filename: 'soon.pdf',
      clientCompanyId: company.id,
      organizationId: org.id,
      expiresAt: past,
    });
    await repo.create({
      filename: 'later.pdf',
      clientCompanyId: company.id,
      organizationId: org.id,
      expiresAt: future,
    });
    const archived = await repo.create({
      filename: 'old.pdf',
      clientCompanyId: company.id,
      organizationId: org.id,
      expiresAt: past,
    });
    await repo.update(archived.id, org.id, { state: 'archived' });

    const all = await repo.findAll(org.id);
    const expiring = all.filter(
      (d) =>
        d.state !== 'archived' &&
        d.expiresAt !== null &&
        d.expiresAt <= new Date('2026-01-01'),
    );
    expect(expiring.map((d) => d.id)).toEqual([soon.id]);
  });

  it('delete enforces tenant boundary (cross-tenant returns false)', async () => {
    const { org: orgA, company: compA } = await seedOrgAndCompany('A', 'A-Co');
    const orgB = await db.prisma.organization.create({ data: { name: 'B' } });
    const doc = await repo.create({
      filename: 'guarded.pdf',
      clientCompanyId: compA.id,
      organizationId: orgA.id,
    });
    expect(await repo.delete(doc.id, orgB.id)).toBe(false);
    expect(await repo.findById(doc.id, orgA.id)).not.toBeNull();
    expect(await repo.delete(doc.id, orgA.id)).toBe(true);
    expect(await repo.findById(doc.id, orgA.id)).toBeNull();
  });
});
