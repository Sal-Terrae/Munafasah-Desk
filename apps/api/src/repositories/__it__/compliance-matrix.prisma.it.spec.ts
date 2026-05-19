import { PrismaService } from '../../prisma.service';
import { ComplianceMatrixPrismaRepository } from '../prisma/compliance-matrix.prisma.repository';
import { ComplianceItemPrismaRepository } from '../prisma/compliance-item.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('ComplianceMatrix + Item (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let matrices: ComplianceMatrixPrismaRepository;
  let items: ComplianceItemPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    matrices = new ComplianceMatrixPrismaRepository(
      db.prisma as unknown as PrismaService,
    );
    items = new ComplianceItemPrismaRepository(
      db.prisma as unknown as PrismaService,
    );
  }, 90_000);

  afterAll(async () => {
    if (db) await db.stop();
  });

  beforeEach(async () => {
    await db.truncateAll();
  });

  async function seedTender() {
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
    return { org, tender };
  }

  it('@@unique([tenderId, version]) blocks duplicate versions', async () => {
    const { org, tender } = await seedTender();
    await matrices.create({
      tenderId: tender.id,
      organizationId: org.id,
      version: 1,
    });
    await expect(
      matrices.create({
        tenderId: tender.id,
        organizationId: org.id,
        version: 1,
      }),
    ).rejects.toThrow();
  });

  it('latestForTender returns the highest version (independent inserts)', async () => {
    const { org, tender } = await seedTender();
    await matrices.create({
      tenderId: tender.id,
      organizationId: org.id,
      version: 1,
    });
    await matrices.create({
      tenderId: tender.id,
      organizationId: org.id,
      version: 2,
    });
    await matrices.create({
      tenderId: tender.id,
      organizationId: org.id,
      version: 3,
    });
    const latest = await matrices.latestForTender(tender.id, org.id);
    expect(latest?.version).toBe(3);
  });

  it('createMany items: all-or-nothing transactional', async () => {
    const { org, tender } = await seedTender();
    const matrix = await matrices.create({
      tenderId: tender.id,
      organizationId: org.id,
      version: 1,
    });
    const created = await items.createMany([
      {
        matrixId: matrix.id,
        organizationId: org.id,
        requirementId: 'r1',
        requirementText: 'Valid CR',
        category: 'legal',
        owner: 'DocController',
        risk: 'low',
        status: 'satisfied',
      },
      {
        matrixId: matrix.id,
        organizationId: org.id,
        requirementId: 'r2',
        requirementText: 'Bid bond',
        category: 'financial',
        owner: 'Finance',
        risk: 'critical',
        status: 'missing',
      },
    ]);
    expect(created).toHaveLength(2);
    const fetched = await items.findAllForMatrix(matrix.id, org.id);
    expect(fetched).toHaveLength(2);
  });

  it('cross-tenant findById/update is denied at repository level', async () => {
    const { org, tender } = await seedTender();
    const otherOrg = await db.prisma.organization.create({
      data: { name: 'Other' },
    });
    const matrix = await matrices.create({
      tenderId: tender.id,
      organizationId: org.id,
      version: 1,
    });
    expect(await matrices.findById(matrix.id, otherOrg.id)).toBeNull();
    await expect(
      matrices.update(matrix.id, otherOrg.id, { status: 'approved' }),
    ).rejects.toThrow();
  });
});
