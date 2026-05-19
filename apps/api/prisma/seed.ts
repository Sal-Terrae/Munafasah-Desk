/**
 * Deterministic pilot seed (dev-only). Passwords are CLEARLY FAKE
 * dev values, never real secrets. Not required by the test suite.
 * Run: npm --workspace apps/api run db:seed
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org' },
    update: {},
    create: { id: 'seed-org', name: 'Pilot Organization' },
  });

  const roles: UserRole[] = [
    UserRole.Owner,
    UserRole.BidManager,
    UserRole.Presales,
    UserRole.Finance,
    UserRole.DocController,
    UserRole.Reviewer,
  ];

  for (const role of roles) {
    const email = `${role.toLowerCase()}@pilot.local`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Pilot ${role}`,
        role,
        password: bcrypt.hashSync(`pilot-dev-${role}`, 8),
        organizationId: org.id,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log('Seeded pilot org + 6 role users (dev-only fake passwords).');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
