import { PrismaService } from '../../prisma.service';
import { EvidenceLinkPrismaRepository } from '../prisma/evidence-link.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('EvidenceLink (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let repo: EvidenceLinkPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    repo = new EvidenceLinkPrismaRepository(
      db.prisma as unknown as PrismaService,
    );
  }, 90_000);

  afterAll(async () => {
    if (db) await db.stop();
  });

  beforeEach(async () => {
    await db.truncateAll();
  });

  async function seed() {
    const org = await db.prisma.organization.create({ data: { name: 'A' } });
    const company = await db.prisma.clientCompany.create({
      data: { name: 'A-Co', organizationId: org.id },
    });
    const tender = await db.prisma.tender.create({
      data: {
        title: 'T',
        organizationId: org.id,
        clientCompanyId: company.id,
      },
    });
    const matrix = await db.prisma.complianceMatrix.create({
      data: { tenderId: tender.id, organizationId: org.id, version: 1 },
    });
    const item = await db.prisma.complianceItem.create({
      data: {
        matrixId: matrix.id,
        organizationId: org.id,
        requirementId: 'r1',
        requirementText: 'Valid CR',
        category: 'legal',
        owner: 'DocController',
        risk: 'low',
        status: 'missing',
      },
    });
    const doc = await db.prisma.clientDocument.create({
      data: {
        filename: 'cr.pdf',
        clientCompanyId: company.id,
        organizationId: org.id,
        documentType: 'legal',
      },
    });
    return { org, item, doc };
  }

  it('@@unique([complianceItemId, documentId]) blocks duplicate links', async () => {
    const { org, item, doc } = await seed();
    await repo.create({
      organizationId: org.id,
      complianceItemId: item.id,
      documentId: doc.id,
    });
    await expect(
      repo.create({
        organizationId: org.id,
        complianceItemId: item.id,
        documentId: doc.id,
      }),
    ).rejects.toThrow();
  });

  it('cascade: deleting the document deletes its evidence links', async () => {
    const { org, item, doc } = await seed();
    const link = await repo.create({
      organizationId: org.id,
      complianceItemId: item.id,
      documentId: doc.id,
    });
    await db.prisma.clientDocument.delete({ where: { id: doc.id } });
    expect(await repo.findById(link.id, org.id)).toBeNull();
  });

  it('cascade: deleting the compliance item deletes its evidence links', async () => {
    const { org, item, doc } = await seed();
    const link = await repo.create({
      organizationId: org.id,
      complianceItemId: item.id,
      documentId: doc.id,
    });
    await db.prisma.complianceItem.delete({ where: { id: item.id } });
    expect(await repo.findById(link.id, org.id)).toBeNull();
  });

  it('unlink is idempotent', async () => {
    const { org, item, doc } = await seed();
    expect(await repo.unlink(item.id, doc.id, org.id)).toBe(false);
    await repo.create({
      organizationId: org.id,
      complianceItemId: item.id,
      documentId: doc.id,
    });
    expect(await repo.unlink(item.id, doc.id, org.id)).toBe(true);
    expect(await repo.unlink(item.id, doc.id, org.id)).toBe(false);
  });
});
