# BidReady KSA — comprehensive audit prompt

This prompt produces a `docs/audit-findings.md` deliverable identical
in structure and rigor to the audit that ran against this codebase
through to P22/P24. Paste the entire body below (from "BEGIN PROMPT"
to "END PROMPT") into a fresh Claude Code session opened in the
**bidready-ksa** repo. Run it before reviewing the sibling
**bidready-tender-ingestion** repo; the addendum at the bottom
explains how to extend the audit to that sibling.

---

## BEGIN PROMPT

You are auditing the BidReady KSA repository (a.k.a. Munafasah-Desk),
a Saudi-Arabia tender bid-readiness SaaS, plus its sibling ingestion
service. Your job is to produce a thorough written audit — **do not
fix anything, do not refactor, do not commit, do not push**. Read,
analyse, and write `docs/audit-findings.md` only.

The deliverable must be honest, evidence-backed, and structured. The
goal is to give a human reviewer a clear, ranked picture of:
(a) what the codebase claims to do,
(b) what it actually does,
(c) where the gaps are,
(d) which gaps are remediable inside the audit scope vs which are
    PRD-future-scope that belongs to product roadmap not the audit.

### Reading list (required, in order)

1. `README.md`
2. `CLAUDE.md` (this file describes the project's operating rules)
3. `docs/prd.md` (the product requirements doc — source of truth for
   what should exist)
4. `docs/architecture.md`
5. `docs/pdpl-controls.md`
6. `docs/local-infra.md`
7. `docs/testing-strategy.md`
8. `docs/audit-findings.md` (previous audit deliverable; use as
   structural reference, not as a substitute for your own analysis)
9. `prisma/schema.prisma` + every `prisma/migrations/*/migration.sql`
10. `apps/api/src/**/*.ts` — every backend file
11. `apps/web/**/*` — every frontend file
12. `infra/docker-compose.yml`
13. `infra/terraform/**`
14. `.github/workflows/**`
15. `.env.example` (verify no real secrets committed)

### Audit dimensions (apply every one — none optional)

Cite **file:line** for every finding. A finding without a file:line is
not a finding.

#### §1 PRD coverage vs implementation

For each functional area in `docs/prd.md`, locate the corresponding
code surface (model + repo + service + controller + UI page).
Tabulate: PRD requirement → implementation status → file:line. Mark
each row as `implemented` / `partial` / `missing` / `out-of-scope`.

#### §2 Architecture alignment

Compare `docs/architecture.md` to what the code actually does. Look
for:
- Provider abstractions stated in the doc but bypassed by direct
  imports (e.g. someone calling `PrismaClient` directly instead of a
  repository).
- Repository-pattern leakage: services importing concrete
  `*PrismaRepository` classes instead of injecting via tokens.
- Module-graph cycles.
- DI tokens used inconsistently (some services token-based, some
  concrete-class-based).
- Global state where the architecture says "per-tenant" or vice versa.

#### §3 Schema completeness + integrity

- Every entity named in the PRD has a Prisma model? List omissions.
- Every model has indexes on the fields the services query? Flag
  N+1 / full-scan risk.
- Cascade rules: `onDelete: Cascade` where children should die with
  the parent; `onDelete: SetNull` where the PDPL audit trail must
  survive subject erasure.
- `BigInt` / `Decimal(p,s)` choices appropriate (money, counters)?
- `@@unique` constraints on what should be unique?
- Models that *should* be tenant-scoped (carry `organizationId`)
  but don't?

#### §4 API surface integrity

For every controller:
- JWT guard present where required?
- `RolesGuard` + `@Roles(...)` present where the route is privileged?
- `@Audited({...})` present on every mutating endpoint with PDPL or
  business sensitivity (consent, retention, data-subject-request,
  webhook, billing, subscription, ingestion, sector classification,
  document upload/delete, training record)?
- Class-validator DTOs present on every body / query?
- Path/Query/Body length caps and shape validators in place?
- Response shape leaks anything sensitive (passwords, secrets,
  internal IDs that look like external)?

Make a single table: endpoint method/path → guards → audit → DTO
validation → notes.

#### §5 Security — OWASP-aligned + Saudi-specific

For each, cite evidence:
- **A01 broken access control**: tenancy isolation verified end-to-end?
  Cross-tenant denial tested? Check for `findUnique({ where: { id }})`
  on tenant-scoped models without an `organizationId` clause.
- **A02 cryptographic failures**: passwords with bcrypt (cost ≥ 10)?
  JWT secret length-enforced (≥ 32 chars)? HMAC keys length-enforced?
  Constant-time comparisons (`timingSafeEqual`) on every bearer or
  signature compare?
- **A03 injection**: any raw SQL? Prisma `$queryRaw` calls? Anywhere
  user input flows into shell / `exec()` / `child_process`? URL
  validation that can be bypassed (SSRF on webhook URLs)?
- **A04 insecure design**: separation of duties on retention /
  data-subject decisions (approver ≠ requester)?
- **A05 misconfiguration**: default credentials still acceptable in
  prod profile? Helmet headers configured? CORS allowlist?
- **A06 vulnerable deps**: `npm audit` output summarized. List any
  CVEs > medium.
- **A07 auth + identification**: brute-force protection / rate limit?
  JWT expiry reasonable? Refresh strategy? Session invalidation on
  password change?
- **A08 integrity failures**: package-lock committed? CI verifies
  lockfile?
- **A09 logging + monitoring**: structured logs? Secret redaction in
  the logger? Every sensitive action audited?
- **A10 SSRF**: webhook URLs validated against private/loopback
  hosts in production?

**PDPL-specific** (Saudi PDPL + SDAIA regulations):
- Consent ledger present, written to before processing personal data?
- Data-subject access / erasure / rectification request flow?
- Authority notification within 72h for high-severity incidents
  (the canonical payload + dispatch path)?
- Retention policy enforced + destruction audited?
- DPO contact registry?
- DPO training register?
- Residency gate on data-export endpoints?
- Document sensitivity classification enforced on reads?
- Audit trail survives subject erasure (user FK SetNull, not
  Cascade)?

#### §6 UI completeness

For each sidebar destination promised in the UI:
- Page exists?
- Renders without crashing?
- Bilingual (ar + en) strings present in `apps/web/lib/i18n.ts`?
- RTL layout works for ar locale?
- SSR vs CSR boundary reasonable?
- Lighthouse a11y / perf budgets respected?

#### §7 Test coverage + reliability

- Unit tests for every service?
- Fakes used in lieu of real Postgres / real LLM / real S3 / real
  Redis? (Real network in tests is a finding.)
- Every fake matches the interface contract of its Prisma counterpart?
- Integration tests for multi-step flows (auth login, DSR
  approve→execute, retention sweep, ingestion sync)?
- Tests deterministic? Any flakes via `setTimeout` or actual clocks?
- Coverage of edge cases (empty input, very long input, unicode,
  malformed dates)?

Run `npm test --silent` and report the totals. Run `npx tsc --noEmit`
and report any errors.

#### §8 Observability + operations

- `/health` + `/readiness` endpoints?
- Structured logging (Pino / Nest Logger) with redaction list
  including `password`, `token`, `api_key`, `apiKey`, `secret`,
  `authorization`?
- Metrics endpoint (`/metrics`) or other Prometheus exposition?
- Audit log table + retention policy?
- Smoke scripts (LLM, DB) runnable?

#### §9 Deployability

- Dockerfile minimal (multi-stage)?
- Cloud Run service account + minimum IAM?
- Workload Identity Federation for GitHub Actions → GCP?
- Terraform state backend configured?
- Secrets sourced from Secret Manager, not env in image?
- CI runs on PRs touching the relevant service?
- Deploy workflow guarded with manual approval for prod?

#### §10 Code-quality nits

- `any` casts that hide real types?
- `findUnique(...) as any` patterns that should be `findUniqueOrThrow`?
- Concrete-class `@Inject(Foo)` patterns that should be token-based?
- Commented-out code or `TODO`/`FIXME` markers?
- Premature abstractions or unused exports?
- Comments that restate the code (low signal)?
- Long files (> 400 lines) that hint at a missing module split?

### Output format

Write the deliverable to `docs/audit-findings.md`. Structure:

```
# BidReady KSA — Audit Findings

Audit date: <ISO date>
Reviewer: <model + session>
HEAD reviewed: <git commit hash>
Test counts at audit time: <admin portal totals> + <ingestion totals>

## §1 PRD coverage
| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| … | implemented/partial/missing | file:line | … |

## §2 Architecture alignment
[finding list]

## §3 Schema
[finding list]

## §4 API surface
| Method+Path | JWT | RolesGuard | @Audited | DTO | Notes |
|---|---|---|---|---|---|
| … | y/n | y/n | y/n | y/n | … |

## §5 Security
### OWASP
| Item | Status | Evidence |
|---|---|---|
| A01 access control | … | … |

### PDPL
[finding list]

## §6 UI
[finding list]

## §7 Test coverage
[finding list + run output]

## §8 Observability
[finding list]

## §9 Deployability
[finding list]

## §10 Code quality
[finding list]

## §11 Remediation roadmap
| Finding ref | Severity | Phase | Effort | Notes |
|---|---|---|---|---|
| §5-A03-1 | critical | P-A | 2h | … |

Severity tiers (use exactly these):
- critical: data loss / privilege escalation / PDPL violation
- high: security / multi-tenant leak risk / breaks PRD acceptance
- medium: hygiene / maintainability that compounds over time
- low: nit / style / docs
- informational: not a defect, kept for the record

Phase tiers (use exactly these):
- P-A: blocker for next release
- P-B: same-quarter
- P-C: next-quarter
- P-D: opportunistic / when touched

## §12 Closure framing — what's NOT in this audit's scope
List PRD-future items the codebase intentionally doesn't yet do:
sector classifier improvements, billing UI, real-Etimad scraper,
WhatsApp opt-in flow, etc. Do not file these as findings —
distinguish "audit's remediation roadmap" (sections §11) from
"product roadmap" (this section).

## §13 What is gated on real-world action
List items that are ready in code but waiting on a human:
- `terraform apply` against a real GCP project
- First Cloud Run deploy
- Full-scale k6 load run
- 5-persona Playwright E2E once staging URL exists
- External security pentest
```

### Process rules — strict

1. **Do not edit code.** This is a read-only review. Do not even
   format or sort imports.
2. **Do not commit.** Write findings to `docs/audit-findings.md` only.
   Do not push.
3. **Every finding must cite file:line.** Drop the finding if you
   can't cite evidence.
4. **Severity discipline.** Don't grade-inflate. A `// TODO` is
   `low` at most.
5. **Don't audit your own opinions.** Audit against the PRD and
   `CLAUDE.md` operating rules. If the code disagrees with the PRD,
   that's a finding. If the code disagrees with your taste, it's not.
6. **PRD-future-scope ≠ audit gap.** A missing feature that the PRD
   explicitly defers belongs in §12, not §1.
7. **Distinguish "missing" from "deliberately punted".** Look at
   commit messages + `docs/roadmap.md` to see what was deferred on
   purpose.
8. **Run the test suite + tsc**. Include actual numbers. "Tests
   look fine" is not a finding.
9. **Run `npm audit`**. Include the actual high+critical CVE count.
10. **Sanity-check every fake** matches its Prisma interface (a fake
    that's drifted from real is a real bug).
11. **Don't recommend implementation in §11**. List the finding +
    expected fix shape. Implementation belongs in a follow-up.
12. **Keep findings short and specific.** One sentence + evidence
    line is usually enough.

### What to specifically watch for (gotchas observed historically)

- Repositories returning `findUnique({ where: { id } }) as any` —
  this hides the null case and is a tenant-isolation hazard. Always
  cite as a finding.
- Services injecting concrete `*PrismaRepository` instead of the
  `*_REPOSITORY` token. Tracks bad in tests + future swap-out.
- `.env.example` committed with real-looking values (>30-char hex,
  starts with `sk-`, etc.).
- Cookies set without `httpOnly: true` and `sameSite: 'strict'`.
- `JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev' })`
  with a dev fallback — should be fail-hard.
- Webhook outbound that doesn't HMAC-sign.
- Webhook inbound that doesn't HMAC-verify.
- Notification dispatchers without a constant-time bearer compare
  on their incoming-webhook auth.
- Sector classifier or LLM call without `BudgetGuard.assertCanSpend`
  in front of it.
- Outbound webhook URLs not rejecting `localhost` / `127.0.0.1` /
  `169.254.*` / `10.*` / `192.168.*` in production.
- Prisma queries with no `where` clause on tenant-scoped models
  (full-scan + tenant leak).
- Tenants identified by string equality on `req.user.organizationId`
  but the FK on the row is mistakenly compared to a different field.

### Sibling-repo addendum (bidready-tender-ingestion)

After the main audit is written, run a smaller pass on the sibling
ingestion repo with these specific lenses:

- Does the LLM provider abstraction match the admin portal's
  (same interface, same env vars, same factory semantics)?
- Does the `PipelineService` write deterministic audit through
  `IngestionRun`?
- Is the sha256 dedup race-safe (UNIQUE on `contentSha256` +
  P2002 catch + lookup)?
- Does `EtimadAdapter` (or any adapter) write timeouts via
  `AbortSignal.timeout`?
- Does the admin-portal sync client refuse to throw on HTTP failure
  (the pipeline must persist curation_ready locally even when the
  admin portal is down)?
- Does the quality gate's `evaluateQuality` produce stable string
  reasons that downstream dashboards can group on?
- Is the BullMQ queue driver only required when `QUEUE_PROVIDER=
  bullmq` (lazy / not the default)?

Write the sibling-repo findings into the same `docs/audit-findings.md`
under a top-level `## Sibling repo: bidready-tender-ingestion`
section so reviewers see both audits in one place.

## END PROMPT

---

## How to run this audit

1. Open a new Claude Code session in `bidready-ksa/`.
2. Paste everything between `BEGIN PROMPT` and `END PROMPT` above.
3. When Claude finishes, it will have created/updated
   `docs/audit-findings.md`. Read it. Re-run the prompt if any
   section feels light — it usually surfaces more on a second pass
   because Claude has the project's vocabulary loaded.

## How to interpret the result

- Sections §1–§10 are *evidence*. Each finding must point at code.
- Section §11 is the *roadmap*. Argue with the severity, not the
  finding text.
- Section §12 is the honest "this isn't ours yet" list. Don't
  treat it as a blocker.
- Section §13 is the operator's punchlist — things ready in code
  but waiting on a real-world action (Cloud Run deploy, pentest,
  etc.).

A clean audit looks like: §1 ≥95% implemented, §5 zero critical /
zero high, §11 no P-A blockers, §12 honest, §13 short and actionable.
