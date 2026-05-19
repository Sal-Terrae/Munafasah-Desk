import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

/**
 * Verifies the cascade boundary we promised in the schema: deleting a
 * tender removes everything that semantically belongs to that tender
 * (matrices, items, requirements, tasks, submission packs) but does
 * NOT remove ClientDocuments — those now belong to ClientCompany and
 * are reusable across tenders (PRD ERD §3).
 */
describeIt('Tender delete cascade (Prisma, real Postgres)', () => {
  let db: IntegrationDb;

  beforeAll(async () => {
    db = await startTestPostgres();
  }, 90_000);

  afterAll(async () => {
    if (db) await db.stop();
  });

  beforeEach(async () => {
    await db.truncateAll();
  });

  it('cascades through matrix/items/requirements/tasks/submissionPacks, leaves ClientDocument intact', async () => {
    const org = await db.prisma.organization.create({ data: { name: 'O' } });
    const company = await db.prisma.clientCompany.create({
      data: { name: 'C', organizationId: org.id },
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
        risk: 'critical',
        status: 'missing',
      },
    });
    const requirement = await db.prisma.tenderRequirement.create({
      data: {
        tenderId: tender.id,
        organizationId: org.id,
        category: 'legal',
        text: 'Valid CR',
      },
    });
    const task = await db.prisma.task.create({
      data: {
        organizationId: org.id,
        tenderId: tender.id,
        title: 'Get CR',
      },
    });
    const pack = await db.prisma.submissionPack.create({
      data: {
        organizationId: org.id,
        tenderId: tender.id,
        version: 1,
        manifestSha256: 'a'.repeat(64),
        itemCount: 1,
      },
    });
    // ClientDocument now belongs to ClientCompany, NOT Tender.
    const doc = await db.prisma.clientDocument.create({
      data: {
        filename: 'cr.pdf',
        clientCompanyId: company.id,
        organizationId: org.id,
        documentType: 'legal',
      },
    });
    // An evidence link from the (about-to-be-deleted) item to the doc
    // should be removed by the item's own cascade.
    const link = await db.prisma.evidenceLink.create({
      data: {
        organizationId: org.id,
        complianceItemId: item.id,
        documentId: doc.id,
      },
    });

    await db.prisma.tender.delete({ where: { id: tender.id } });

    // Cascaded:
    expect(
      await db.prisma.complianceMatrix.findUnique({ where: { id: matrix.id } }),
    ).toBeNull();
    expect(
      await db.prisma.complianceItem.findUnique({ where: { id: item.id } }),
    ).toBeNull();
    expect(
      await db.prisma.tenderRequirement.findUnique({
        where: { id: requirement.id },
      }),
    ).toBeNull();
    expect(
      await db.prisma.task.findUnique({ where: { id: task.id } }),
    ).toBeNull();
    expect(
      await db.prisma.submissionPack.findUnique({ where: { id: pack.id } }),
    ).toBeNull();
    expect(
      await db.prisma.evidenceLink.findUnique({ where: { id: link.id } }),
    ).toBeNull();

    // NOT cascaded — reusable across bids:
    const survivedDoc = await db.prisma.clientDocument.findUnique({
      where: { id: doc.id },
    });
    expect(survivedDoc).not.toBeNull();
    expect(survivedDoc?.clientCompanyId).toBe(company.id);
  });
});
