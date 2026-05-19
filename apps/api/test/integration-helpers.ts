/**
 * Integration-test helpers: spin up a real Postgres via testcontainers,
 * materialise the schema via `prisma db push`, expose a PrismaClient
 * bound to the container's URL.
 *
 * Designed to no-op cleanly when Docker isn't available: tests can call
 * `dockerAvailable()` at module load and switch to `describe.skip` /
 * `it.skip` so `npm test`/`npm run test:integration` runs without
 * Docker (just skips integration cases).
 */
import { execSync } from 'child_process';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

export interface IntegrationDb {
  prisma: PrismaClient;
  url: string;
  stop: () => Promise<void>;
  truncateAll: () => Promise<void>;
}

const PRISMA_SCHEMA = resolve(__dirname, '../../../prisma/schema.prisma');

/** Synchronous Docker probe — safe to call at module load time. */
export function dockerAvailable(): boolean {
  try {
    execSync('docker info', {
      stdio: 'ignore',
      env: { ...process.env, DOCKER_CLI_HINTS: 'false' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function startTestPostgres(): Promise<IntegrationDb> {
  const container: StartedPostgreSqlContainer =
    await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('bidready_it')
      .withUsername('bidready')
      .withPassword('bidready-it')
      .start();

  const url = container.getConnectionUri();

  execSync(
    `npx prisma db push --schema="${PRISMA_SCHEMA}" --skip-generate --accept-data-loss`,
    {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'inherit',
    },
  );

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });
  await prisma.$connect();

  // The order matters only if not using CASCADE. We use CASCADE for safety.
  // Note: table names are exact PascalCase as Prisma generates them.
  async function truncateAll(): Promise<void> {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE
        "EvidenceLink",
        "ComplianceItem",
        "ComplianceMatrix",
        "TenderRequirement",
        "Task",
        "SubmissionPack",
        "ClientDocument",
        "AuditEvent",
        "Tender",
        "ClientCompany",
        "User",
        "Organization"
      RESTART IDENTITY CASCADE`,
    );
  }

  async function stop(): Promise<void> {
    await prisma.$disconnect().catch(() => undefined);
    await container.stop();
  }

  return { prisma, url, stop, truncateAll };
}
