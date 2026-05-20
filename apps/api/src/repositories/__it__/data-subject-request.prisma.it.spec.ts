import { PrismaService } from '../../prisma.service';
import { DataSubjectRequestPrismaRepository } from '../prisma/data-subject-request.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('DataSubjectRequest (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let repo: DataSubjectRequestPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    repo = new DataSubjectRequestPrismaRepository(
      db.prisma as unknown as PrismaService,
    );
  }, 90_000);

  afterAll(async () => {
    if (db) await db.stop();
  });

  beforeEach(async () => {
    await db.truncateAll();
  });

  async function org(name = 'O') {
    return db.prisma.organization.create({ data: { name } });
  }

  it('pending → approved → completed lifecycle persists', async () => {
    const o = await org();
    const created = await repo.create({
      organizationId: o.id,
      type: 'access',
      subjectEmail: 'a@b.c',
      requestedBy: 'admin-1',
    });
    expect(created.status).toBe('pending');

    const approved = await repo.update(created.id, o.id, {
      status: 'approved',
      decidedBy: 'admin-2',
      decidedAt: new Date(),
    });
    expect(approved.status).toBe('approved');
    expect(approved.decidedBy).toBe('admin-2');

    const completed = await repo.update(created.id, o.id, {
      status: 'completed',
      completedAt: new Date(),
      payload: { sample: true } as never,
    });
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).not.toBeNull();
    expect((completed.payload as Record<string, unknown>).sample).toBe(true);
  });

  it('findAll filters by status, scoped to org', async () => {
    const o = await org('O1');
    const o2 = await org('O2');
    await repo.create({
      organizationId: o.id,
      type: 'access',
      subjectEmail: 'a@b.c',
    });
    await repo.create({
      organizationId: o.id,
      type: 'erasure',
      subjectEmail: 'a@b.c',
    });
    await repo.create({
      organizationId: o2.id,
      type: 'access',
      subjectEmail: 'a@b.c',
    });
    expect(await repo.findAll(o.id, 'pending')).toHaveLength(2);
    expect(await repo.findAll(o.id, 'completed')).toHaveLength(0);
    expect(await repo.findAll(o2.id)).toHaveLength(1);
  });

  it('cross-tenant findById/update is denied', async () => {
    const o = await org('O1');
    const o2 = await org('O2');
    const r = await repo.create({
      organizationId: o.id,
      type: 'access',
      subjectEmail: 'a@b.c',
    });
    expect(await repo.findById(r.id, o2.id)).toBeNull();
    await expect(
      repo.update(r.id, o2.id, { status: 'approved' }),
    ).rejects.toThrow();
  });

  it('findForSubject returns history scoped to the subject + org', async () => {
    const o = await org();
    await repo.create({
      organizationId: o.id,
      type: 'access',
      subjectEmail: 'a@b.c',
    });
    await repo.create({
      organizationId: o.id,
      type: 'erasure',
      subjectEmail: 'a@b.c',
    });
    await repo.create({
      organizationId: o.id,
      type: 'access',
      subjectEmail: 'other@b.c',
    });
    expect(await repo.findForSubject('a@b.c', o.id)).toHaveLength(2);
    expect(await repo.findForSubject('other@b.c', o.id)).toHaveLength(1);
  });
});
