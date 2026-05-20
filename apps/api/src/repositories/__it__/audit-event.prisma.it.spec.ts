import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditEventPrismaRepository } from '../prisma/audit-event.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('AuditEvent — PDPL erasure preserves audit (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let repo: AuditEventPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    repo = new AuditEventPrismaRepository(
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
    const org = await db.prisma.organization.create({ data: { name: 'O' } });
    const user = await db.prisma.user.create({
      data: {
        email: 'subject@acme.test',
        name: 'Subject',
        role: UserRole.Reviewer,
        organizationId: org.id,
      },
    });
    return { org, user };
  }

  it('SetNull: deleting a user pseudonymises their audit FK, the row survives', async () => {
    const { org, user } = await seed();
    const ev = await repo.create({
      action: 'tender.view',
      entityType: 'Tender',
      entityId: 't-1',
      userId: user.id,
      organizationId: org.id,
    });
    expect(ev.userId).toBe(user.id);

    await db.prisma.user.delete({ where: { id: user.id } });

    const survivor = await db.prisma.auditEvent.findUnique({
      where: { id: ev.id },
    });
    expect(survivor).not.toBeNull();
    expect(survivor!.userId).toBeNull();
    // org FK is intact (still cascades on org delete)
    expect(survivor!.organizationId).toBe(org.id);
  });

  it('findForUser returns user-scoped events (tenant-guarded)', async () => {
    const { org, user } = await seed();
    const otherOrg = await db.prisma.organization.create({
      data: { name: 'O2' },
    });
    await repo.create({
      action: 'tender.view',
      entityType: 'Tender',
      entityId: 't-1',
      userId: user.id,
      organizationId: org.id,
    });
    // Same userId surfaced under a foreign org must NOT leak.
    expect(await repo.findForUser(user.id, otherOrg.id)).toHaveLength(0);
    expect(await repo.findForUser(user.id, org.id)).toHaveLength(1);
  });

  it('anonymiseUser nullifies userId only for that user + org', async () => {
    const { org, user } = await seed();
    const otherUser = await db.prisma.user.create({
      data: {
        email: 'other@acme.test',
        name: 'Other',
        role: UserRole.Reviewer,
        organizationId: org.id,
      },
    });
    await repo.create({
      action: 'a',
      entityType: 'E',
      entityId: '1',
      userId: user.id,
      organizationId: org.id,
    });
    await repo.create({
      action: 'b',
      entityType: 'E',
      entityId: '2',
      userId: otherUser.id,
      organizationId: org.id,
    });

    const count = await repo.anonymiseUser(user.id, org.id);
    expect(count).toBe(1);

    expect(await repo.findForUser(user.id, org.id)).toHaveLength(0);
    expect(await repo.findForUser(otherUser.id, org.id)).toHaveLength(1);
  });
});
