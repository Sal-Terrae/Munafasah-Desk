# BidReady KSA

**Arabic-first, sector-configurable bid-readiness workspace** for Saudi
government and institutional tenders. Turns a tender from "found" into
"submission-ready" with provable traceability, PDPL-aligned audit, and
deterministic compliance evidence.

> **Status: P11 complete — security hardening, persistence, PDPL
> surface, and per-tender RBAC are in. P12a adds Cloud Run deploy
> infra (Dockerfiles + Terraform + WIF-authed deploy workflows +
> initial Prisma migration + UX polish). Etimad adapter, worker
> queue consumer, load tests, and the daily retention scheduler
> land with P12b.**

The full audit + remediation history lives in
[`docs/audit-findings.md`](docs/audit-findings.md); the test plan in
[`docs/testing-strategy.md`](docs/testing-strategy.md).

## Monorepo layout

```text
apps/
  web/                # Next.js 15 + React 19 (Arabic-first, RTL, App Router)
  api/                # NestJS 10 / TypeScript API
workers/
  docpipeline/        # Python: parse, OCR, extract, score, export
packages/
  shared-types/       # shared TS contracts
prisma/
  schema.prisma       # Postgres schema (15+ models)
  migrations/         # versioned migrations (0001_init baseline)
infra/
  docker-compose.yml  # local Postgres + Redis + MinIO
  terraform/          # Artifact Registry + Cloud Run + Cloud SQL + WIF
docs/                 # prd, architecture, pdpl, audit findings, testing
.github/workflows/    # ci.yml + api-deploy.yml + web-deploy.yml
```

## Prerequisites

- Node.js 20 (`.node-version`)
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- Docker (for local Postgres + integration tests)

## Local quickstart

```bash
# 1. Start local dependencies
docker compose -f infra/docker-compose.yml up -d

# 2. Install workspaces
npm ci

# 3. Generate the Prisma client + materialise the schema locally
npm --workspace apps/api run prisma:generate
DATABASE_URL=postgresql://bidready:bidready_dev_pw@localhost:5432/bidready \
  npm --workspace apps/api run prisma:push

# 4. Seed pilot org + 6-role users (dev-only fake passwords)
DATABASE_URL=postgresql://bidready:bidready_dev_pw@localhost:5432/bidready \
  npm --workspace apps/api run db:seed

# 5. Start the API (JWT_SECRET must be >=32 chars; fail-hard otherwise)
JWT_SECRET="$(openssl rand -base64 48)" \
DATABASE_URL=postgresql://bidready:bidready_dev_pw@localhost:5432/bidready \
CORS_ORIGIN=http://localhost:3000 \
  npm run dev:api

# 6. In another shell — start the web shell
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 \
  npm run dev:web
```

## Running tests

```bash
# Unit (api + web + workers)
npm test
npm --workspace apps/web test
(cd workers/docpipeline && uv run pytest)

# Integration (testcontainers Postgres; needs Docker)
npm --workspace apps/api run test:integration
```

CI runs additional lanes on every push to `main`:
unit (Node + Python), `api-integration` (testcontainers Postgres),
`security` (Gitleaks + Trivy + Semgrep), `web-a11y` (Lighthouse CI),
`terraform-validate`.

## Deploy

See [`infra/terraform/README.md`](infra/terraform/README.md) for the
one-time GCP setup (`terraform apply`, set `jwt-secret`, configure
GitHub repo secrets).

Once secrets are in place, pushing to `main` triggers
[`.github/workflows/api-deploy.yml`](.github/workflows/api-deploy.yml)
and [`web-deploy.yml`](.github/workflows/web-deploy.yml): WIF-auth →
build → push to Artifact Registry → roll out to Cloud Run. The API
image runs `prisma migrate deploy` on container boot, so schema is
always in sync with `main`.

## Project provenance

- `docs/prd.md` — canonical product requirements.
- `docs/architecture.md` — phased delivery plan.
- `docs/pdpl-controls.md` — Saudi PDPL control mapping.
- `docs/audit-findings.md` — comprehensive audit + remediation log.
  §10/11/12/13 record P9/P10/P11/P12a remediation slices.
- `docs/testing-strategy.md` — concrete plan for the test categories
  we couldn't run during the audit.
