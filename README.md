# BidReady KSA

Arabic-first, sector-configurable **bid-readiness workspace** for Saudi
government and institutional tenders. Turns a tender from "found" into
"submission-ready" with provable traceability.

> **Status: Phase 0 — foundation & scaffolding.** Skeleton only. No
> business logic yet. See `docs/prd.md` for the full PRD and
> `docs/architecture.md` for the phased delivery plan.

## Monorepo layout

```text
apps/
  web/                 # Next.js (Arabic-first, RTL)
  api/                 # NestJS / TypeScript API
workers/
  docpipeline/         # Python: parse, OCR, extract, score, export
packages/
  shared-types/        # shared TS contracts (populated from Phase 1)
infra/
  docker-compose.yml   # local Postgres + Redis + MinIO
docs/                  # prd.md, architecture.md, pdpl-controls.md
.github/workflows/     # CI (typecheck/test/build)
```

## Prerequisites

- Node.js 20 (`.node-version`)
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- Docker (for local Postgres / Redis / MinIO)

## Local development

```bash
# 1. Local infrastructure (Postgres, Redis, MinIO)
docker compose -f infra/docker-compose.yml up -d

# 2. JS/TS workspaces
npm install
npm run typecheck
npm test
npm run build

# 3. Run the API (http://localhost:8080/health)
npm run dev:api

# 4. Run the web app (http://localhost:3000)
npm run dev:web

# 5. Python worker
cd workers/docpipeline
uv sync --extra dev
uv run pytest
uv run python -m docpipeline.main   # Redis heartbeat
```

Copy `.env.example` to `.env` for local runs. Values there are
non-secret dev-only defaults.

## Tests

- TS/JS: `npm test` (Jest; offline, deterministic).
- Python: `uv run pytest` in `workers/docpipeline` (offline, no Redis
  required for the smoke suite).

External LLM / OCR / cloud services are never called in tests.
