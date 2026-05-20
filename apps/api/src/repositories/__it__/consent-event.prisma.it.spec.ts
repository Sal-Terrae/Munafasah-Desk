import { PrismaService } from '../../prisma.service';
import { ConsentEventPrismaRepository } from '../prisma/consent-event.prisma.repository';
import {
  dockerAvailable,
  startTestPostgres,
  IntegrationDb,
} from '../../../test/integration-helpers';

const HAS_DOCKER = dockerAvailable();
const describeIt = HAS_DOCKER ? describe : describe.skip;

describeIt('ConsentEvent (Prisma, real Postgres)', () => {
  let db: IntegrationDb;
  let repo: ConsentEventPrismaRepository;

  beforeAll(async () => {
    db = await startTestPostgres();
    repo = new ConsentEventPrismaRepository(
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

  it('records grant + withdraw; findCurrent returns the most recent', async () => {
    const o = await org();
    await repo.create({
      organizationId: o.id,
      subjectEmail: 'a@b.c',
      purpose: 'whatsapp_reminders',
      state: 'granted',
    });
    // Sleep > 1ms so recordedAt strictly orders.
    await new Promise<void>((r) => setTimeout(r, 10));
    await repo.create({
      organizationId: o.id,
      subjectEmail: 'a@b.c',
      purpose: 'whatsapp_reminders',
      state: 'withdrawn',
    });
    const current = await repo.findCurrent(
      'a@b.c',
      'whatsapp_reminders',
      o.id,
    );
    expect(current?.state).toBe('withdrawn');
  });

  it('is tenant-scoped — cross-org lookups return null', async () => {
    const o1 = await org('O1');
    const o2 = await org('O2');
    await repo.create({
      organizationId: o1.id,
      subjectEmail: 'a@b.c',
      purpose: 'p',
      state: 'granted',
    });
    expect(await repo.findCurrent('a@b.c', 'p', o2.id)).toBeNull();
    expect(await repo.findAllForSubject('a@b.c', o2.id)).toEqual([]);
  });

  it('anonymiseSubject rewrites email + nullifies subjectUserId for this org only', async () => {
    const o1 = await org('O1');
    const o2 = await org('O2');
    await repo.create({
      organizationId: o1.id,
      subjectEmail: 'a@b.c',
      subjectUserId: 'u-1',
      purpose: 'p',
      state: 'granted',
    });
    await repo.create({
      organizationId: o2.id,
      subjectEmail: 'a@b.c',
      purpose: 'p',
      state: 'granted',
    });
    const count = await repo.anonymiseSubject(
      'a@b.c',
      o1.id,
      'redacted@erased.local',
    );
    expect(count).toBe(1);
    expect(await repo.findAllForSubject('a@b.c', o1.id)).toEqual([]);
    expect(await repo.findAllForSubject('a@b.c', o2.id)).toHaveLength(1);
    const redacted = await repo.findAllForSubject(
      'redacted@erased.local',
      o1.id,
    );
    expect(redacted).toHaveLength(1);
    expect(redacted[0].subjectUserId).toBeNull();
  });
});
