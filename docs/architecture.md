# BidReady KSA — Architecture (Phase 0)

This is a living document. Phase 0 establishes the skeleton only; no
business logic exists yet.

## Components

| Component | Tech | Status |
|---|---|---|
| Web app | Next.js (App Router, RTL, ar/en) | skeleton |
| API | NestJS / TypeScript | skeleton (`/health`) |
| Workers | Python (`docpipeline`) | skeleton (Redis heartbeat) |
| DB | PostgreSQL (+ FTS) | local via Docker Compose |
| Queue/cache | Redis | local via Docker Compose |
| Object store | S3-compatible (MinIO local) | local via Docker Compose |

## Pipeline rule (binding)

The LLM extracts, summarizes, classifies, and proposes. Deterministic
rules own deadlines, document expiry, access rights, and final
submission authority. Every parsed tender passes a human review gate
before it is published to a workspace.

## Phased delivery

See `docs/prd.md` for the full PRD. Delivery is phased and reviewed:

- Phase 0 — foundation & scaffolding (this commit)
- Phase 1 — tenancy, identity, audit
- Phase 2 — tender intake & document vault
- Phase 3 — parse & extraction pipeline
- Phase 4 — bid/no-bid fit scoring
- Phase 5 — compliance matrix, evidence matching, tasks/reminders
- Phase 6 — submission-readiness exports
- Phase 7 — Arabic-first frontend
- Phase 8 — hardening: security, PDPL, observability, CI/CD, infra
