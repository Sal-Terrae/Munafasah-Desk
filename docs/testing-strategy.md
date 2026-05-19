# Munafasah‑Desk — Testing Strategy for the Gaps

**Companion to** [`audit-findings.md`](./audit-findings.md). For each test
category that could not be executed in the initial audit, this doc
specifies the concrete tools, commands, prerequisites, CI integration,
and acceptance criteria. New findings from running these will be folded
back into the phase plan (P9–P12).

## 0. Prerequisites that unblock most of this

Before most categories below can run, the following must exist:

1. **A real Postgres** for the api (`testcontainers` for unit‑integration tests; a long‑running staging Postgres for E2E/load).
2. **`prisma migrate dev`** applied → schema present, `@prisma/client` generated against it.
3. **Auth UI + real fetch wiring** in `apps/web` (P9). Without this, E2E/UAT/load/a11y of authenticated flows are not meaningful.
4. **`apps/api` security middleware** (Helmet/CORS/rate‑limit/ValidationPipe) — otherwise DAST will trivially find what we already know.
5. **A staging deploy** (Docker Compose for now, Cloud Run/OCI later) — for DAST, load, real E2E from CI.

Sequencing: **P9 unlocks E2E/component/UAT/a11y**; **P10 unlocks integration**; **P12 brings load + external pentest**.

## 1. Integration testing (api ↔ real Postgres)

**Why:** all current backend tests use fake repos. The Prisma path (FKs, `updateMany.count` race semantics, `onDelete: Cascade`, transactions, compound unique indices) is **unverified**.

**Tooling**
- `@testcontainers/postgresql` (Node) — spins an ephemeral `postgres:16-alpine` per suite.
- Separate jest config (`jest.it.config.js`) so unit suite stays sub‑second.
- Prisma migration applied via `prisma migrate deploy` against the container's URL.

**Files**
```
apps/api/src/**/*.it.spec.ts        # integration specs (one per Prisma repo)
apps/api/jest.it.config.js          # testRegex *.it.spec.ts, longer timeout
apps/api/test/setup-postgres.ts     # bring up container, set DATABASE_URL, migrate
```

**Spec template (per repo)**
```ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
let pg, prisma;
beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = pg.getConnectionUri();
  execSync('npx prisma migrate deploy', { cwd: '../..' });
  prisma = new PrismaService();
});
afterAll(() => Promise.all([prisma.$disconnect(), pg.stop()]));
```

**Coverage targets**
- Every Prisma repo: create/findFirst/findAll/updateMany‑count/deleteMany‑count, cross‑tenant denial, `onDelete: Cascade` semantics.
- Append‑only invariant verified by attempting (via raw SQL) an update on `AuditEvent` and asserting controller path forbids it.
- Compound unique migration once `(id, organizationId)` is introduced.

**CI** — new `api-integration` job, `services: postgres:16` OR rely on testcontainers + Docker; nightly + on PRs touching `apps/api/src/repositories/**`.

**Acceptance:** ≥ 1 it‑spec per Prisma repo; full it‑suite green on Postgres 16.

## 2. End‑to‑end testing (Playwright, real api+web)

**Prereq:** P9 ships the login UI + real fetch wiring. **Until then, only the public dashboard render path is E2E‑testable.**

**Tooling** — `@playwright/test` (already installed locally; add as devDep at root + add `playwright.config.ts`).

**Files**
```
apps/web/e2e/auth.spec.ts            # login round‑trip → dashboard
apps/web/e2e/tender-intake.spec.ts   # create tender → list → detail
apps/web/e2e/vault.spec.ts           # register doc → set state → expiring filter
apps/web/e2e/compliance.spec.ts      # generate matrix → tasks → export pack
playwright.config.ts                 # baseURL=http://localhost:3000, webServer: [api,web]
```

**Run**
```bash
# spin api + web (against test Postgres), then:
npx playwright test --reporter=line,html
```

**Scenarios (priority order — one per PRD persona / job‑to‑be‑done)**
1. **Owner**: login → see KPI strip → open a tender → drill into matrix.
2. **BidManager**: create tender → upload doc (when upload lands) → generate matrix → assign tasks.
3. **Finance**: register a financial doc → see it satisfy a bond requirement.
4. **DocController**: see expiring docs → mark archived → no reminder re‑sent.
5. **Reviewer**: read‑only access denied to delete (sensitivity‑class gate).

**CI** — separate `e2e` job; staging URL via env; `--shard` for parallelism; HTML report uploaded as artifact.

**Acceptance:** all 5 persona scenarios pass headless on Chromium + Firefox; one mobile viewport (iPhone 14) smoke.

## 3. Load testing (k6 against staging)

**Prereq:** staging api + Postgres running; auth flow live.

**Tooling** — `k6` (script in JS, no agent, native macOS/Linux binary).

**Files**
```
infra/load/k6.options.ts            # stages: warmup 30s @ 10vu, ramp to 50vu over 2m, hold 5m
infra/load/scenarios/login.ts       # POST /auth/login (cached token reused)
infra/load/scenarios/dashboard.ts   # GET /tenders (with token)
infra/load/scenarios/matrix.ts      # POST /tenders/:id/compliance-matrix
infra/load/scenarios/export.ts      # POST /tenders/:id/submission-pack
```

**SLO targets (from PRD)**
- P95 dashboard fetch (`GET /tenders` + N expiring/criticals) **< 2 s**.
- P99 `POST /compliance-matrix` **< 4 s** at 50 VU sustained.
- 0 5xx; ≤ 0.1% 4xx (excluding intentional 401/409).

**Run**
```bash
k6 run -e BASE_URL=https://staging-api... -e TOKEN=$TOKEN infra/load/scenarios/dashboard.ts
```

**CI** — nightly only (not per‑PR); fail the build on SLO regression > 10% vs last 7‑day baseline.

**Acceptance:** all 4 scenarios meet SLOs; saved baseline JSON committed to `infra/load/baselines/`.

## 4. User Acceptance Testing (UAT)

**Prereq:** P9 (auth UI) + at least P10 partial (so users can actually accomplish jobs).

**Approach** — two layers:
1. **Scripted Playwright UAT** that exactly mirrors PRD §"Personas and jobs to be done" — driven by data fixtures so the scenario is deterministic.
2. **Manual UAT checklists** (one per persona) in `docs/uat/`, executed by a real Saudi tender SME during the pilot.

**Files**
```
docs/uat/owner.md
docs/uat/bid-manager.md
docs/uat/presales.md
docs/uat/finance.md
docs/uat/doc-controller.md
docs/uat/reviewer.md
apps/web/e2e/uat/*.spec.ts          # the scripted version of each
```

**Each persona checklist contains:**
- The job‑to‑be‑done verbatim from PRD.
- 5–10 click‑level steps.
- Pass/fail criteria + bug‑report template.
- Expected timing budget per step (helps surface UX friction).

**Acceptance:** every persona checklist passes a first‑run dry pass by the team; then a second pass by an external SME during the pilot.

## 5. Pen / security testing

Three layers, all required.

### 5.1 SAST in CI
- **Semgrep** with explicit configs (auto‑config requires telemetry — we ship explicit):
  ```bash
  semgrep ci \
    --config=p/javascript --config=p/typescript --config=p/nestjs \
    --config=p/secrets --config=p/owasp-top-ten \
    --error --metrics=on
  ```
- **Trivy fs** (deps + IaC + secrets):
  ```bash
  trivy fs --exit-code 1 --severity HIGH,CRITICAL \
    --skip-dirs node_modules --skip-dirs .venv --skip-dirs .next .
  ```
- **Gitleaks** on every PR:
  ```bash
  gitleaks detect --no-banner -s . --exit-code 1
  ```
- **`npm audit --omit=dev`** as a second opinion against the GH advisory DB.

### 5.2 DAST against staging
- **OWASP ZAP baseline scan** (`zap-baseline.py`) against staging api, authenticated.
- **`@nestjs/throttler`** in place + `helmet` + body‑size cap before this runs (otherwise we find what we already know).

### 5.3 Manual review
- **OWASP ASVS Level 2** checklist completed and committed to `docs/security/asvs.md`.
- Token handling review (expiry, rotation, refresh, revocation).
- Authorization matrix (who can call what) committed to `docs/security/authz-matrix.md`.

### 5.4 External pentest gating
Engage an external pentester **only after**: P9 security middleware lands, P10 persistence lands, P11 PDPL wiring lands. Earlier engagements waste budget on findings we already know.

**Acceptance:** zero HIGH/CRITICAL from Semgrep/Trivy/Gitleaks; clean ZAP baseline; ASVS L2 checklist passed; external pentest report with all HIGH findings resolved.

## 6. Accessibility (WCAG 2.1 AA)

**Tooling**
- `@axe-core/playwright` — assertion in every E2E test.
- `pa11y` — URL‑level CI gate.
- `lighthouse-ci` — performance + a11y score per‑PR, with budget.

**Files**
```
apps/web/e2e/a11y.spec.ts            # runs axe on every key route
lighthouserc.json                    # a11y ≥ 95, perf ≥ 80 budgets
```

**Spec template**
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/login', '/tenders', '/tenders/t-1']) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

**Manual checklist (every PR touching `apps/web`):** keyboard‑only traverse, screen‑reader smoke (VoiceOver on macOS), zoom 200%, high‑contrast (Windows + macOS), RTL/LTR toggle parity.

**Acceptance:** zero axe violations on every named route; lighthouse a11y ≥ 95.

## 7. Component testing

### 7.1 Web (apps/web)
**Tooling** — Vitest + `@testing-library/react` + jsdom.
**Files**
```
apps/web/vitest.config.ts
apps/web/components/__tests__/*.spec.tsx
```
**Minimum per component**: renders with fixture; RTL direction asserted; landmark roles queryable; key text in both `ar` and `en` (when locale toggle lands).

### 7.2 Backend (apps/api)
**Tooling** — `@nestjs/testing` + `supertest`. Boots a Nest `TestingModule` with `JwtAuthGuard` + `RolesGuard` real, repositories overridden with Fakes.
**Files**
```
apps/api/src/**/__tests__/*.controller.spec.ts
```
**Minimum per controller**: 401 without JWT, 403 when role missing, 200 with proper auth + tenant scoping verified end‑to‑end through DI.

**Acceptance:** every public route has at least one controller spec (auth+RBAC+tenant), every web component has at least one render test.

## 8. Smoke (post‑deploy)

**Files** — `infra/smoke/post-deploy.sh`
```bash
set -euo pipefail
curl -fsS "$BASE_URL/health" | jq -e '.status=="ok"'
curl -fsS "$BASE_URL/" >/dev/null
TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@pilot","password":"…"}' | jq -r .access_token)
curl -fsS "$BASE_URL/tenders" -H "authorization: Bearer $TOKEN" >/dev/null
```
**CI** — runs as the last step of every deploy; non‑zero exit rolls back.

## 9. Contract testing (FE/BE drift)

**Tooling** — Nest exposes OpenAPI via `@nestjs/swagger`; `openapi-typescript` generates TS clients consumed by `apps/web`.
**Steps**
1. Add `@nestjs/swagger` + emit `apps/api/openapi.json` at build.
2. Add `apps/web/scripts/generate-api-types.sh` running `openapi-typescript` from that JSON.
3. CI fails if generated types differ from committed `apps/web/lib/api.gen.ts`.

**Acceptance:** FE compiles only against generated types; PR diff shows the change when the contract changes.

## 10. Localization parity

- Per‑locale Playwright snapshot for every key route (`/?locale=ar`, `/?locale=en`).
- `lib/i18n.ts` keys exhaustive coverage check (CI fails if a key is missing in one locale).
- `Intl.NumberFormat('ar-SA')` for SAR currency; Hijri date formatter helper.

## 11. Exploratory + bug‑bash

- Quarterly **charter‑based** exploratory sessions (90 minutes each) targeting a specific risk area: tenant boundary, RBAC, expiry edge cases, RTL/LTR mixing, Arabic OCR confidence edges.
- One **bug bash** before each pilot rollout — whole team for 2 hours; findings filed as issues with severity + repro.

## 12. CI topology

New jobs to add over P9–P12:

| Job | Trigger | What it runs |
|---|---|---|
| `unit-api` | PR | `npm --workspace apps/api run prisma:generate && typecheck && test` |
| `unit-py` | PR | `uv sync --extra dev && uv run ruff check . && uv run pytest` |
| `unit-web` | PR | `tsc --noEmit && next build`; add `vitest` in P9 |
| **`api-integration`** | PR (touching repos) + nightly | testcontainers Postgres + `*.it.spec.ts` |
| **`security`** | PR | semgrep + trivy + gitleaks + `npm audit` (fail on HIGH+) |
| **`e2e`** | PR (touching UI/auth) + nightly | Playwright against ephemeral compose stack |
| **`a11y`** | PR (touching UI) | axe via Playwright + pa11y + lighthouse‑ci |
| **`load`** | nightly | k6 against staging; baseline diff |
| **`smoke`** | post‑deploy | `infra/smoke/post-deploy.sh` |
| **`contract`** | PR | regenerate types from OpenAPI; fail on drift |

## 13. Sequencing (what to do first)

1. **P9 (P0 of testing):** security middleware + auth UI + fix CVEs + add SAST job (`security`).
2. **P10 (P1 of testing):** Postgres `api-integration` lane + interface‑token DI refactor + persistence; add `contract` job.
3. **P11 (P2 of testing):** PDPL wiring; expand controller spec coverage; add `AuditInterceptor` and verify via integration tests.
4. **P12 (P3 of testing):** `e2e` + `a11y` + nightly `load`; staging deploy + `smoke`; engage external pentest.

## 14. Done‑when

- Every test category in §1–§11 has at least one runnable spec/script committed to the repo.
- CI green on a fresh PR includes: `unit-*`, `security`, `contract` (always); `api-integration`, `e2e`, `a11y` on touching PRs; `load` + `smoke` on the nightly + deploy lanes.
- Zero HIGH/CRITICAL from SAST + Trivy + Gitleaks.
- WCAG 2.1 AA: zero axe violations on every named route.
- Load SLOs met at 50 VU sustained.
- External pentest report with HIGH findings resolved.

> Findings from executing this strategy will be appended to
> [`audit-findings.md`](./audit-findings.md) and folded into the
> P9–P12 phase plan.
