/**
 * Multi-tenancy hardening (defense in depth).
 *
 * The repositories already pass `organizationId` to every tenant-
 * scoped query, but this is enforced only at the service layer. A
 * future bug — e.g. a service forgetting to include orgId, or a new
 * developer using `prisma.tender.findMany({})` to "just list all" —
 * would silently leak across tenants.
 *
 * This module exports:
 *  - TENANT_SCOPED_MODELS: the set of Prisma models that own data
 *    per organization.
 *  - SAFE_BYPASS_KEYS: where-clause keys whose presence makes a
 *    cross-tenant query *intentional* (globally unique fields like
 *    email/messageId/uuid id when looked up by a known token).
 *  - assertTenancy(model, args, opts): pure function that inspects a
 *    Prisma query's `where` and either returns silently, logs a
 *    warning, or throws TenancyViolationError depending on opts.
 *
 * Wired into PrismaService via $extends so every query passes
 * through. Default mode is 'warn'; flip TENANCY_STRICT_MODE=true to
 * fail closed in production.
 */

export class TenancyViolationError extends Error {
  constructor(
    public readonly model: string,
    public readonly operation: string,
  ) {
    super(
      `tenancy violation: ${operation} on ${model} without organizationId in where`,
    );
    this.name = 'TenancyViolationError';
  }
}

/** Models with an organizationId column. */
export const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'User',
  'ClientCompany',
  'Tender',
  'ClientDocument',
  'AuditEvent',
  'ComplianceMatrix',
  'ComplianceItem',
  'TenderRequirement',
  'EvidenceLink',
  'Task',
  'SubmissionPack',
  'ConsentEvent',
  'DataSubjectRequest',
  'TenderAccess',
  'DpoContact',
  'IngestionJob',
  'RetentionAction',
  'LlmUsageLog',
  'DpoTrainingRecord',
  'InboundEmail',
  'WebhookSubscription',
  'WebhookDelivery',
]);

/**
 * Where-clause top-level keys that, when present, make a tenancy-less
 * query intentional (the field is globally unique). The accessor MUST
 * still tenant-scope the *result* — assertions here only prove that
 * the query target is constrained to a known token, not that it's
 * safe to expose the row without an org check.
 */
export const SAFE_BYPASS_KEYS: ReadonlySet<string> = new Set([
  'email',        // User by email (auth flow)
  'messageId',    // InboundEmail by messageId (idempotency)
]);

/** Operations we enforce on. Aggregates/raw escape into 'unknown' and
 *  are left alone — the surface they expose is too broad to model. */
const ENFORCED_OPERATIONS: ReadonlySet<string> = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'aggregate',
  'groupBy',
]);

export interface TenancyAssertion {
  ok: boolean;
  reason?:
    | 'has-organizationId'
    | 'has-safe-bypass-key'
    | 'no-enforcement-needed'
    | 'where-missing-or-empty'
    | 'organizationId-missing';
}

/** Pure inspector — does NOT throw. Wrap with assertTenancy() to
 *  enforce. Public so unit tests can exercise it without DI. */
export function inspectTenancy(
  model: string,
  operation: string,
  args: unknown,
): TenancyAssertion {
  if (!TENANT_SCOPED_MODELS.has(model)) {
    return { ok: true, reason: 'no-enforcement-needed' };
  }
  if (!ENFORCED_OPERATIONS.has(operation)) {
    return { ok: true, reason: 'no-enforcement-needed' };
  }
  // create / createMany are write-only; the create payload is the new
  // row, which the repository is expected to populate with the right
  // organizationId. We don't try to inspect data — too easy to false-
  // positive on nested connect/connectOrCreate shapes. Reads/updates/
  // deletes are where cross-tenant leakage actually happens.
  const a = (args ?? {}) as Record<string, unknown>;
  const where = a.where as Record<string, unknown> | undefined;
  if (!where || typeof where !== 'object') {
    return { ok: false, reason: 'where-missing-or-empty' };
  }
  if ('organizationId' in where && where.organizationId !== undefined) {
    return { ok: true, reason: 'has-organizationId' };
  }
  // Some queries use a nested AND/OR. Recurse a single layer for AND
  // because that's the common case; deep OR splits across tenants
  // remain ambiguous and we leave them as violations to be explicit.
  if (Array.isArray(where.AND)) {
    for (const clause of where.AND) {
      if (
        clause &&
        typeof clause === 'object' &&
        'organizationId' in (clause as Record<string, unknown>)
      ) {
        return { ok: true, reason: 'has-organizationId' };
      }
    }
  }
  for (const k of SAFE_BYPASS_KEYS) {
    if (k in where) return { ok: true, reason: 'has-safe-bypass-key' };
  }
  return { ok: false, reason: 'organizationId-missing' };
}

export interface AssertTenancyOpts {
  strict: boolean;
  log?: (msg: string) => void;
}

export function assertTenancy(
  model: string,
  operation: string,
  args: unknown,
  opts: AssertTenancyOpts,
): void {
  const r = inspectTenancy(model, operation, args);
  if (r.ok) return;
  const msg = `[tenancy] ${operation} on ${model}: ${r.reason}`;
  opts.log?.(msg);
  if (opts.strict) {
    throw new TenancyViolationError(model, operation);
  }
}

/** Read flag from env once per process. */
export function isStrictTenancyMode(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.TENANCY_STRICT_MODE === 'true';
}
