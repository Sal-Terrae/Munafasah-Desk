import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { TenderAccessPrismaRepository } from '../prisma/tender-access.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('TenderAccess (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let repo: TenderAccessPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    repo = new TenderAccessPrismaRepository(
      db.prisma as unknown as PrismaService,
    );
  }, 90_000);

  afterAll(async () => {
    if (db) await db.stop();
  });

  beforeEach(async () => {
    await db.truncateAll();
  });

  async function seedOrgUserTender() {
    const org = await db.prisma.organization.create({ data: { name: 'O' } });
    const company = await db.prisma.clientCompany.create({
      data: { name: 'C', organizationId: org.id },
    });
    const user = await db.prisma.user.create({
      data: {
        email: 'u@a.test',
        name: 'U',
        role: UserRole.Reviewer,
        organizationId: org.id,
      },
    });
    const tender = await db.prisma.tender.create({
      data: {
        title: 'T',
        organizationId: org.id,
        clientCompanyId: company.id,
      },
    });
    return { org, user, tender };
  }

  it('@@unique([userId, tenderId]) prevents duplicate access rows', async () => {
    const { org, user, tender } = await seedOrgUserTender();
    await repo.create({
      organizationId: org.id,
      userId: user.id,
      tenderId: tender.id,
      role: 'Reviewer',
    });
    await expect(
      repo.create({
        organizationId: org.id,
        userId: user.id,
        tenderId: tender.id,
        role: 'Editor',
      }),
    ).rejects.toThrow();
  });

  it('cascade: deleting the user removes their access rows', async () => {
    const { org, user, tender } = await seedOrgUserTender();
    const ta = await repo.create({
      organizationId: org.id,
      userId: user.id,
      tenderId: tender.id,
      role: 'Editor',
    });
    await db.prisma.user.delete({ where: { id: user.id } });
    expect(await repo.findById(ta.id, org.id)).toBeNull();
  });

  it('cascade: deleting the tender removes its access rows', async () => {
    const { org, user, tender } = await seedOrgUserTender();
    const ta = await repo.create({
      organizationId: org.id,
      userId: user.id,
      tenderId: tender.id,
      role: 'Reviewer',
    });
    await db.prisma.tender.delete({ where: { id: tender.id } });
    expect(await repo.findById(ta.id, org.id)).toBeNull();
  });

  it('revoke is idempotent (returns true once, false thereafter)', async () => {
    const { org, user, tender } = await seedOrgUserTender();
    expect(await repo.revoke(user.id, tender.id, org.id)).toBe(false);
    await repo.create({
      organizationId: org.id,
      userId: user.id,
      tenderId: tender.id,
      role: 'Viewer',
    });
    expect(await repo.revoke(user.id, tender.id, org.id)).toBe(true);
    expect(await repo.revoke(user.id, tender.id, org.id)).toBe(false);
  });
});
