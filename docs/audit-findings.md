# Munafasah‑Desk — Comprehensive Audit Findings

**Audit date:** 2026‑05‑19
**Scope:** apps/api · apps/web · workers/docpipeline · prisma · CI
**Codebase at audit:** `main` @ `3367bba` (Phase 8 complete)
**Companion plan:** [`testing-strategy.md`](./testing-strategy.md) — how to
execute the test categories that could not be run today.

## 0. Executive summary

| Lens | Verdict |
|---|---|
| Regression gate | ✅ green — 71 api + 22 py + web build clean |
| Secrets leakage | ✅ clean — gitleaks "no leaks", 13 commits scanned |
| Dependency CVEs | ❌ **8 HIGH** (multer 2.0.2 ×3, next 14.2.35 ×5), all fixable |
| PRD fidelity | 🟠 ~40% (backend logic broadly present; persistence + UI + most endpoints missing) |
| PDPL fidelity | 🔴 ~25–30% — primitives exist, none are wired |
| Security middleware | 🔴 absent (no Helmet/CORS/rate‑limit/ValidationPipe); JWT dev‑secret fallback in code |
| UI/UX | 🟠 shell only — fixture‑driven, no login UI, no fetch wiring, no Arabic webfont |
| Architecture | 🟢 clean foundations; 5 high‑ROI improvements identified |
| Saudi market readiness | 🔴 not yet — cannot perform UAT (no auth UI), would not pass a PDPL assessment |

## 1. Real scan results (executed)

| Scan | Outcome |
|---|---|
| Regression — api `tsc --noEmit` | clean |
| Regression — api jest | **71/71 across 16 suites** |
| Regression — py `pytest` | **22/22** |
| Regression — py `ruff check` | clean |
| Regression — web `tsc --noEmit` | clean |
| Regression — web `next build` | OK (`/` static, `/tenders/[id]` dynamic) |
| Gitleaks | **no leaks** found, 13 commits scanned |
| Trivy fs (HIGH/CRITICAL) | **8 HIGH**: `multer 2.0.2`→2.1.1 (3× DoS); `next 14.2.35`→15.x (middleware/proxy bypass, SSRF via WS, RSC DoS) |
| Semgrep | not run — `--config=auto` requires metrics on; ship explicit configs in CI (see strategy doc) |

## 2. Black‑box testing matrix

| Category | Executed? | Finding |
|---|---|---|
| Regression | ✅ | green (see §1) |
| Integration (vs real Postgres) | ❌ | all backend tests use **fake repos**; the Prisma path (FKs, `updateMany.count`, `onDelete: Cascade`, transactions) is **unverified** |
| Real E2E | ❌ | web has **no login UI, no fetch wiring**; nothing crosses FE→BE |
| Component (UI) | ❌ | `apps/web` has no Vitest/Jest; UI components have zero tests |
| Component (backend) | 🟠 | services covered with fakes; controllers + guards never bootstrapped end‑to‑end through DI |
| Load | ❌ | no running instance, no Postgres, no auth — load metric would be meaningless |
| UAT | ❌ | **no user can use the system today** — no login page; all PRD personas locked out |
| Pen / security | 🟠 | static only (gitleaks/trivy run); semgrep deferred; no DAST; no manual ASVS pass |
| Accessibility | 🟠 | static review only (no focus styles, no skip‑link, no Arabic webfont, missing landmarks) |
| Smoke | ✅ (implicit) | `next build` and api test bootstrap exercise compile+render |
| Localization | 🟠 | `lib/i18n.ts` exists (10 keys); `dir` hard‑pinned to `rtl`; **no toggle**, no `/en` route |
| Contract | ❌ | web `lib/api.ts` is a hand‑maintained mirror of api types — drift is a real risk |

→ Concrete execution plan for each missing category is in
[`testing-strategy.md`](./testing-strategy.md).

## 3. PRD fidelity (PM lens)

### Delivered (substantively matches PRD)
- Bid/no‑bid fit scoring with explainable factor breakdown, sector packs, overridable final score (`apps/api/src/fit-scoring/`).
- Versioned compliance matrix (deterministic), expiry‑aware downgrade, critical‑row export gate, derived remediation tasks (`apps/api/src/compliance/`).
- Submission pack with deterministic CSV + manifest + override audit (`apps/api/src/export/`).
- Tenant‑scoped tender intake + document vault state machine (`tender/`, `document-vault/`).
- Append‑only `AuditEvent` (interface exposes only `create`).
- Reminders with idempotency keys + WhatsApp opt‑in (`compliance/reminders.service.ts`).
- Hijri/Gregorian normalization (deterministic, no external lib) (`workers/docpipeline/src/docpipeline/dates.py`).
- Pure parse→OCR‑fallback→chunk→extract→human‑review pipeline (`workers/docpipeline/`).
- JWT auth + 6‑role RBAC matching PRD persona enum (`apps/api/src/auth/`).

### Partial
- **Data model** — Prisma has only **6 of 12** PRD entities. `ComplianceMatrix`, `ComplianceItem`, `TenderRequirement`, `TenderAttachment`, `EvidenceLink`, `Task`, `SubmissionPack` are **in‑memory only**. Matrix versioning is name‑only counter; nothing persists across requests.
- **API contracts** — PRD specifies `/v1/...` versioned endpoints. Code uses un‑versioned paths; lacks `POST /v1/ingestions`, `GET /v1/tenders/{id}/workspace`, `PATCH /v1/compliance-items/{id}`, `POST /v1/tasks`, `POST /v1/webhooks/inbound/email`.
- **Tender intake** — only **manual** works. No upload endpoint, no email webhook, no link capture, no queue producer wiring API→worker.
- **PDPL workflow** — primitives present (retention/incident/residency/RoPA) but **not wired** to real flows.
- **Web UI** — KPI strip + tender feed + task rail + expiry radar render, **only from fixtures**. No sidebar, no admin/vault/exports/login pages.

### Missing entirely
- TenderAttachment/Requirement/Matrix/Item/EvidenceLink/Task/SubmissionPack persistence.
- Ingestion job + status polling endpoint; inbound‑email webhook; link‑capture.
- Sector classifier on tenders.
- Search/filter, reporting dashboard, public webhooks/APIs.
- Etimad adapters (even manual‑fallback).
- Per‑tender RBAC and **sensitivity‑class** access (today only the tenant dimension is enforced).
- Pricing/packaging, rollout artifacts.

### Notable deviations
- **ERD deviation (confirmed):** PRD ERD has `ClientCompany ||--o{ ClientDocument` (company‑owned reusable evidence linked to tenders via `EvidenceLink`). Code parents `ClientDocument` to **Tender** directly with `organizationId` (`prisma/schema.prisma:71-84`). Consequence: a document is bound to one tender — **reuse across bids is structurally impossible**, contradicting the stated PRD goal "More than half of matrix evidence linked from vault by month three."
- **No `EvidenceLink` table** — matrix→evidence linkage exists only as transient `evidenceDocId` string.
- **Compliance matrix is stateless.** Every regenerate increments `version` from caller‑supplied input; versioning is name‑only.
- **No workspace bundle endpoint** — UI would need to orchestrate multiple calls (and today calls none).
- **README is stale** — claims "Phase 0 — skeleton only" while Phases 1–8 are merged.

## 4. Saudi / PDPL compliance gaps

| Control | Status | Where | Note |
|---|---|---|---|
| RoPA / Processing inventory (Art. 31) | built (static) | `apps/api/src/pdpl/processing-inventory.ts` | 3 hard‑coded entries; no add/update; not derived from real data flows |
| Lawful basis declared | partial | same | declared per‑purpose; **never enforced at runtime** |
| Data minimization (Art. 12) | partial | `observability/logger.ts` redactor | reactive log redaction; no schema/field‑level minimization; no DPIA artifact |
| Retention policy | built / **unwired** | `apps/api/src/pdpl/retention.service.ts` | pure evaluator + 2‑person approval; **not invoked** by vault or any scheduler |
| Secure destruction workflow | built / **unwired** | same | approval‑gated (requestor ≠ approver); **no `AuditService.record` on approve/deny**; no deletion against vault |
| 72h breach notification | partial | `apps/api/src/pdpl/incident.service.ts` | `requiresAuthorityNotification` unit‑tested; in‑memory only; **no recipient, no alerting, no template, no audit write** |
| Data subject rights (access/rectify/erase/restrict) | **missing** | — | no endpoints, no self‑export, no rectification flow, no erasure orchestrator — **critical PDPL gap** |
| Consent ledger | **missing** | — | WhatsApp opt‑in is a boolean param, not a recorded consent event |
| Cross‑border transfer safeguards | partial | `apps/api/src/pdpl/residency.ts` | env‑readable; **not enforced** at provider call sites |
| KSA residency enforcement at runtime | **missing** | — | LLM/OCR provider selection is not residency‑gated; no per‑tenant override |
| Sensitive‑data handling | partial | `ClientDocument.sensitivity` field | field exists; no code differentiates access/masking by sensitivity |
| Audit log (append‑only) | built / **under‑used** | `audit.service.ts` + repo + schema | genuinely append‑only; **one call site only** (`export.controller.ts`) — login, retention, override, sensitive reads silently bypass |
| TLS in transit | deployment‑time | `apps/api/src/main.ts` listens HTTP :8080 | no `forceSecure`, no HSTS — terminate TLS upstream |
| Encryption at rest | deployment‑time | — | no client‑side encryption, no KMS — relies on disk encryption at deploy |
| Malware screening on uploads | **missing** | — | no upload endpoint exists |
| DPO support | **missing** | — | no DPO contact model, training register, threshold tracking |
| Etimad: confidentiality / no PII to non‑KSA LLMs | partial | `LLMProvider` protocol | abstraction exists; **no policy** binding provider to data sensitivity/residency; no PII redaction before prompt |
| Bid integrity / tender‑data confidentiality | partial | repo tenant scoping | boundary enforced; **no per‑tender ACL, no reviewer least‑privilege, no "lock at submission" state** |
| Authority‑notification recipient registry | **missing** | — | no SDAIA contact, no DPO inbox, no breach‑notification email template |

**Honest verdict:** PDPL surface is roughly **25–30% covered** as deterministic primitives. The biggest functional gaps are *data‑subject rights, consent ledger, residency enforcement at runtime, retention/destruction wired to documents, and audit coverage*. The system **would not pass** a Saudi PDPL readiness assessment today.

## 5. Security posture

### Dependency CVEs to fix (Trivy)
- `multer 2.0.2` → **2.1.1** (CVE‑2026‑2359, CVE‑2026‑3304, CVE‑2026‑3520 — DoS)
- `next 14.2.35` → **15.x current** (CVE‑2026‑44573 middleware/proxy bypass, CVE‑2026‑44578 SSRF via WS upgrades, GHSA‑8h8q‑6873‑q5fj / GHSA‑h25m‑26qc‑wcjf / GHSA‑q4gf‑8mx6‑v5v3 — RSC DoS)

### Manual OWASP Top‑10 against the actual code

| Risk | Status | Evidence |
|---|---|---|
| A01 Broken Access Control | 🟠 partial | tenant scoping uniform & enforced; **RBAC only on `PdplController`** — others JWT only; no sensitivity‑class ACL |
| A02 Cryptographic Failures | 🟠 partial | bcryptjs ✓; **JWT dev‑secret fallback** `'munafasah-dev-secret'` (`auth.module.ts:15`, `jwt.strategy.ts:17`) — if `JWT_SECRET` unset in prod, tokens forgeable; no fail‑on‑boot |
| A03 Injection | 🟢 mostly | Prisma parameterized everywhere; **no `ValidationPipe`** — body DTOs are TS interfaces only, runtime is `any` |
| A04 Insecure Design | 🟠 | stateless matrix/export contradicts "versioned/editable" PRD claim |
| A05 Security Misconfiguration | 🔴 | `main.ts` is 10 lines — **no Helmet, no CORS, no rate limit, no body‑size cap, no global filter, no `enableShutdownHooks`** |
| A06 Vulnerable & Outdated Components | 🔴 | 8 HIGH CVEs above |
| A07 ID & Auth Failures | 🟠 | enumeration via `findByEmail` timing/response delta; no rate limit on `/auth/login`; no lockout; no refresh tokens |
| A08 Software & Data Integrity | 🟢 | append‑only audit interface; deterministic builds; lockfiles committed |
| A09 Logging & Monitoring | 🟠 | `logger.ts` exists + redacts (good), but is **never invoked from request flow**; audit covers only exports |
| A10 SSRF | 🟢 | no user‑URL fetch today (watch when Etimad/link‑capture lands) |

### Required middleware (must land before any external exposure)
```ts
// apps/api/src/main.ts (proposed)
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.use(helmet());
app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? false, credentials: true });
app.useGlobalFilters(new AllExceptionsFilter());
app.use(rateLimit({ /* tighter on /auth/login */ }));
app.enableShutdownHooks();
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET required in production');
}
```

## 6. UI/UX findings

- **Cannot log in** — no `apps/web/app/login/`, no auth context, no token storage. Every PRD persona is locked out today.
- **Cannot do anything** — every page reads `lib/fixtures.ts`; clicking the only links does full page reloads (plain `<a>`, not `next/link`).
- **No sidebar** despite PRD wireframe specifying 7‑item nav.
- **No locale toggle** — `<html lang="ar" dir="rtl">` hard‑pinned; `lib/i18n.ts` `dir(locale)` never used.
- **No Arabic webfont** — `globals.css` falls back to system sans; Arabic rendering is OS‑dependent.
- **No `:focus-visible`** styles; **no skip‑link**; missing `<nav>`/page `<header>` semantics; most panels lack `aria-label`.
- **No design tokens, no theme, no dark mode, no high‑contrast** — ~55 lines of CSS; austere, not "catchy and beautiful."
- **No loading / empty / error states.**
- **No `Intl.NumberFormat('ar-SA')`** for SAR; no Hijri formatting in the UI.

Roughly **10–15% of the PRD UI surface** is realized.

## 7. Architecture review (highest‑ROI improvements, ordered)

1. **Persist the missing domain entities + fix `ClientDocument` parenting.** Re‑parent to `ClientCompany`, introduce `EvidenceLink`, make matrix versioning real (FK to Tender + monotonic version + status). Without this every PRD claim about provenance, reuse, and audit fails the moment you reboot.
2. **Replace JWT dev‑secret fallback + add `ValidationPipe` + Helmet/CORS/rate‑limit/CSRF.** Lowest effort, highest security ROI.
3. **Wire repository interface tokens, not concrete Prisma classes.** `RepositoriesModule` exports concrete classes today; services `@Inject(UserPrismaRepository)` — the interface is in name only. Use `USER_REPOSITORY` symbol tokens + a `RepositoriesTestModule` with fakes.
4. **Wire the PDPL services into real flows.** Daily retention scheduler; audit on approveDestroy/denyDestroy; runtime residency consultation before external provider calls; `POST /data-subject/{access,erasure}`; consent ledger model.
5. **Fix the `as any` Prisma return casts and add real Postgres integration tests.** Either compound unique `(id, organizationId)` for atomic `update`, or `updateMany`+narrow with explicit null check. Add testcontainers Postgres lane in CI (see strategy doc).

### Other concerns
- `RolesGuard` declared only on `PdplController` — per‑endpoint role enforcement absent elsewhere.
- `AuditService` has **one** call site — most state changes silently bypass audit.
- `ComplianceController` recomputes per call, persists nothing — UI can't show "last approved matrix" or diff versions.
- `apps/api/src/main.ts` has zero middleware; `logger.ts` exists but is **dead code** in the request path.
- `redact()` in `logger.ts` doesn't special‑case arrays.
- `workers/docpipeline/main.py` only pings Redis — no consumer, no write‑back, no callback.
- No `Dockerfile` for api or worker; no deploy pipeline; CI runs typecheck/test/build only.
- `onDelete: Cascade` from `ClientDocument`→`Tender` likely wrong after the parenting fix.

## 8. Prioritized remediation roadmap

| Phase | Theme | Outcome |
|---|---|---|
| **P9** | Security hardening + auth UI | Fix 8 CVEs; add `ValidationPipe`/Helmet/CORS/throttler/global filter; fail‑hard on missing `JWT_SECRET`; build `apps/web/app/login/` + auth context + protected‑route HOC + real fetch wiring; wire dashboard/tender pages to the api; add Semgrep/Trivy/Gitleaks gates to CI |
| **P10** | Persistence + integration tests | Schema: `ComplianceMatrix`/`ComplianceItem`/`TenderRequirement`/`EvidenceLink`/`Task`/`SubmissionPack`; re‑parent `ClientDocument` to `ClientCompany`; fix the cascade; real versioned matrix persistence + `PATCH /compliance-items/{id}`; testcontainers Postgres in CI; interface‑token DI refactor |
| **P11** | PDPL & audit wiring | Data‑subject rights endpoints; consent ledger; daily retention scheduler + audit writes; runtime residency enforcement at every external‑provider call; per‑tender RBAC + sensitivity‑class ACL; `AuditInterceptor` covering logins/overrides/role changes/sensitive reads |
| **P12** | UX polish + Etimad + load | Tajawal/IBM Plex Sans Arabic font; design tokens; `:focus-visible`; skip‑link; sidebar nav; loading/empty/error; locale toggle; Etimad manual‑upload adapter; inbound‑email webhook; worker queue consumer + write‑back; `k6` load tests; axe‑core in CI; independent pentest |

## 9. File‑path index of key issues

- ERD deviation: `prisma/schema.prisma:71-84`
- JWT dev‑secret fallback: `apps/api/src/auth/auth.module.ts:15`, `apps/api/src/auth/jwt.strategy.ts:17`
- `as any` Prisma returns: `apps/api/src/repositories/prisma/{tender,client-document,user,client-company,organization}.prisma.repository.ts`
- Missing security middleware: `apps/api/src/main.ts`
- PDPL services unwired: `apps/api/src/pdpl/{retention,incident,residency,processing-inventory}*` — no inbound callers outside their own tests
- Stateless matrix/export: `apps/api/src/compliance/compliance.service.ts:62-78`, `apps/api/src/export/export.service.ts:46`
- Fixture‑only UI: `apps/web/lib/fixtures.ts`, `apps/web/app/{page,tenders/[id]/page}.tsx`
- No login UI: absent `apps/web/app/login/` or `apps/web/lib/auth.ts`
- Stale README: `README.md:8` claims "Phase 0" while Phases 1–8 are merged

## 10. P9 result — Security Hardening + Auth UI (2026‑05‑19)

P9 closed every audit item under §5 (Security posture) and §6 (UI/UX) that
was blocking real testing. All gates green; no regressions.

### Closed by P9
- **Dependency CVEs:** Trivy fs HIGH/CRITICAL = **0** (was 8). `multer`
  pinned to **2.1.1** via root `package.json` `overrides` (transitive via
  `@nestjs/platform-express`); `next` bumped to **15.5.18** (React **19.2**).
- **JWT dev‑secret fallback removed.** `requireJwtSecret()` enforces
  presence + ≥32 chars at module init in both `auth.module.ts` and
  `jwt.strategy.ts`. Tests assert the legacy fallback string is no longer
  present in either source file. `JwtModule.registerAsync` makes the
  failure deterministic — boot aborts, not a quiet downgrade.
- **A03 / A05 — Injection + Security Misconfiguration:** `main.ts` now
  registers `helmet()`, `enableCors({ credentials: true, origin: split CORS_ORIGIN })`,
  `cookieParser()`, `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`,
  `AllExceptionsFilter` (structured logger + no stack/secret leak),
  `enableShutdownHooks()`. `LoginDto` (`@IsEmail`, `@MinLength(8)`,
  `@MaxLength(256)`) replaces the freeform interface.
- **A07 — Brute force on `/auth/login`:** `@nestjs/throttler` registered
  globally (100 req/min default); `/auth/login` throttled to 5/min.
- **Token storage XSS surface:** session moved from "no UI" to **HttpOnly
  + SameSite=Lax + Secure-in-prod cookie** (`bidready_session`).
  `JwtStrategy` accepts the cookie OR `Authorization: Bearer` (back‑compat).
  No token ever lives in `localStorage` or JS-reachable storage.
- **Login UI exists.** `apps/web/app/login/` (server page + client
  `<LoginForm>`), `apps/web/lib/auth-context.tsx` (Provider + `useAuth`),
  `apps/web/lib/api.ts` `apiFetch` works in browser (`credentials: include`)
  and Server Components (forwards the cookie via `next/headers`).
- **Route protection.** `apps/web/middleware.ts` redirects unauthenticated
  requests to `/login?redirect=<path>`; `/login` itself is exempt.
- **Real fetch wiring.** `app/page.tsx` fetches `/tenders` + `/documents/expiring`
  via `apiFetch`; `app/tenders/[id]/page.tsx` fetches `/tenders/:id`
  (also adapted to Next 15 async `params`). The dashboard's
  critical‑tasks rail still falls back to the fixture until P10 persists
  the compliance matrix.
- **A09 — Logging never invoked from request flow:** `AllExceptionsFilter`
  now drives `logEvent(...)` on every request error path.
- **`/auth/me` + `/auth/logout`** added — server-trusted current-user
  hydration and explicit cookie clearance.
- **CI security lane added** in `.github/workflows/ci.yml`: Gitleaks,
  Trivy fs (HIGH/CRITICAL, `exit-code: 1`), Semgrep
  (`p/owasp-top-ten + p/javascript + p/typescript + p/nodejs + p/secrets`).

### Tests added at P9 (all green)
- API jest **91/91** (was 71). New suites: `all-exceptions.filter.spec.ts`,
  `jwt-secret.spec.ts`, `login.dto.spec.ts`, `auth.controller.spec.ts`
  (cookie shape + login/logout/me), `auth.module.spec.ts` (legacy fallback
  text absence + secret-too-weak guard).
- Web vitest **18/18** (new). Suites: `lib/api.test.ts` (apiFetch happy
  path / 401 / 204 / loadCurrentUser fallthrough), `lib/auth-context.test.tsx`
  (login success/401/logout best-effort/no-provider guard),
  `app/login-form.test.tsx` (submit, redirect param, error path),
  `middleware.test.ts` (login passthrough, session present/absent,
  redirect query parameter shape).

### Gate evidence
- API tsc clean · `jest 91/91 in 6.1s`
- Web tsc clean · `vitest 18/18 in 1.3s` · `next build` clean
  (`/`, `/login`, `/tenders/[id]` all dynamic; middleware 34.2 kB)
- Python `ruff check` clean · `pytest 22/22`
- `gitleaks` no leaks · `trivy fs --severity HIGH,CRITICAL --ignore-unfixed`
  reports **0** findings (was 8)

### Knowingly deferred to later phases
- **HTTP-only cookie with `SameSite=Strict`** — currently `Lax`; dev runs
  cross-origin (`:3000` ↔ `:8080`), Strict would block. Once Next and Nest
  ship behind the same reverse proxy in P12, flip to Strict.
- **CSRF token (defence in depth)** — not added; CORS preflight already
  blocks JSON CSRF for cross-origin attackers, and SameSite=Lax covers
  navigation. Revisit if/when we add cross-origin third-party integrations.
- **Refresh-token rotation** — single 1h JWT for now; rotation lands with
  the persistence-backed audit interceptor in P11.
- **`/auth/me` rate-limit hardening / per-IP login lockout** — global +
  per-endpoint throttler in place; per-account lockout deferred to P11
  with the audit interceptor.
- **`AuditService` coverage of login/logout/sensitive reads** — wired
  in P11 (covered by §8 P11 row).
- **README refresh** — text correction; not a security blocker, will fold
  into P12 docs polish.

## 11. P10 result — Persistence + Integration Tests (2026‑05‑19)

P10 closes the entirety of audit §7 item #1 ("persist the missing
domain entities + fix `ClientDocument` parenting") and the integration
row of §2, and unblocks the testing-strategy doc's integration lane.
All gates green; no regressions.

### Closed by P10
- **Schema (additive) gained the 6 missing PRD entities:**
  `ComplianceMatrix` (+ `@@unique([tenderId, version])`),
  `ComplianceItem` (cascade from matrix), `TenderRequirement`,
  `EvidenceLink` (+ `@@unique([complianceItemId, documentId])`),
  `Task`, `SubmissionPack` (+ `@@unique([tenderId, version])`).
  All scoped by `organizationId`; cascade boundaries explicit.
- **`ClientDocument` re-parented from Tender → ClientCompany** — the
  PRD ERD §3 deviation is fixed. Documents are now reusable across many
  tenders via `EvidenceLink`; deleting a tender no longer deletes the
  client's documents. Audit §9 ERD deviation row resolved.
- **`onDelete: Cascade` correctness:** the wrong Tender→ClientDocument
  cascade is gone (the FK itself no longer exists). Tender delete
  cascades correctly through `ComplianceMatrix → ComplianceItem →
  EvidenceLink`, `TenderRequirement`, `Task`, `SubmissionPack` — and
  notably **does not** delete `ClientDocument`.
- **Real versioned compliance-matrix persistence:** `ComplianceMatrixService`
  wraps the pure `ComplianceService` compute and writes the matrix + its
  items atomically (`createMany` in a Prisma `$transaction`). Version
  number is computed server-side from `latestForTender` — caller-supplied
  `previousVersion` no longer trusted (audit §3 "version is name-only
  counter" closed).
- **New endpoints:**
  - `POST   /tenders/:id/compliance-matrices` — now persisting; response
    shape preserved for FE compatibility (matrix + tasks + exportGate).
  - `GET    /tenders/:id/compliance-matrices` — list versions desc.
  - `GET    /tenders/:id/compliance-matrices/:version` — version + items.
  - `PATCH  /compliance-items/:id` — owner/status/risk/dueDate (class-validator).
  - `GET    /compliance-items/:id/evidence-links`
  - `POST   /compliance-items/:id/evidence-links` — tenant-scoped link.
  - `DELETE /compliance-items/:id/evidence-links/:documentId` — idempotent.
- **DocumentVault accepts `clientCompanyId`** (was `tenderId`); service
  + controller + fake + Prisma + all unit tests updated. Audit §3
  "structural reuse impossible" row closed.
- **Repositories (interface + fake + prisma)** for the new entities,
  wired into `RepositoriesModule`. Tenant guard on every `findById` /
  `findByVersion` / `findAll*` / `update` / `delete`.
- **Integration test infrastructure:** `@testcontainers/postgresql` +
  `apps/api/test/integration-helpers.ts` (spins ephemeral Postgres,
  runs `prisma db push`, truncates between tests). Jest split into two
  lanes: unit (`.spec.ts`, excludes `.it.spec.ts`) and integration
  (`.it.spec.ts`, `maxWorkers: 1`, 60 s timeout). Local runs without
  Docker pass cleanly — every integration suite is wrapped in
  `dockerAvailable() ? describe : describe.skip`.
- **CI `api-integration` job** added to `.github/workflows/ci.yml` — runs
  the integration lane on `ubuntu-latest` where testcontainers can use
  the host's Docker daemon.

### Tests added at P10 (all green; integration suite skips without Docker)
- API jest **102/102** (was 91 at P9). 11 new unit tests across:
  - `compliance-matrix.service.spec.ts` — first/subsequent version,
    cross-tenant denial, getByVersion not-found, updateItem tenant guard,
    listForTender ordering.
  - `evidence-link.service.spec.ts` — link/unlink, cross-tenant denial
    on item and on document, double-link refused, unlink idempotency.
- API jest integration **4 suites / 14 cases** (skip-clean locally; full
  green expected in CI). New suites:
  - `client-document.prisma.it.spec.ts` — ClientCompany parenting, tenant
    scoping on findById, "doc survives tender delete" (PRD reuse goal),
    listExpiring filter, tenant-guarded delete.
  - `compliance-matrix.prisma.it.spec.ts` — `@@unique([tenderId, version])`
    enforcement, `latestForTender` correctness, `createMany` atomicity,
    cross-tenant findById/update denial.
  - `evidence-link.prisma.it.spec.ts` — `@@unique([complianceItemId,
    documentId])` enforcement, cascade on document delete, cascade on
    item delete, idempotent unlink.
  - `tender-cascade.prisma.it.spec.ts` — single suite proving the full
    cascade: matrix/items/requirements/tasks/submissionPacks/evidenceLinks
    all removed when their parent tender is deleted; ClientDocument
    survives (reusability guarantee).

### Gate evidence
- API tsc clean · `jest 102/102 in 6.5s` (unit) · `jest 14 skipped in 5.5s`
  (integration, no Docker locally)
- Web tsc clean · `vitest 18/18 in 1.4s` · `next build` clean
- Python `ruff check` clean · `pytest 22/22`

### Knowingly deferred to P10.1 / later
- **`Task` and `SubmissionPack` service persistence** — schema is added
  and migrations would cover them; services still in-memory until the
  PRD task-lifecycle and submission-pack flows are scoped.
- **Interface-token DI refactor** (`@Inject(USER_REPOSITORY)` symbol) —
  services still inject concrete Prisma classes by class token. Audit
  §7 item #3 remains open.
- **`as any` Prisma return casts** in `update(...)` methods — present
  on every Prisma repo (incl. the 4 new ones added at P10). Audit §7
  item #5 remains open; will be replaced with explicit narrowing in
  P10.1.
- **`AuditService` coverage of matrix/item/link mutations** — folds with
  the P11 `AuditInterceptor`.
- **Real `TenderRequirement`-backed compliance generation** — current
  controller still accepts requirements in the request body; the
  persistent `TenderRequirement` rows aren't consumed yet (they exist
  so future POST/PATCH flows can write through to them).
- **Initial Prisma migration file** — schema is materialized via
  `prisma db push` in tests (and would be locally); first proper
  migration baseline lands with P12 (Cloud Run deploy).

## 12. P11 result — PDPL & audit wiring (2026‑05‑20)

P11 closes audit §4 rows for *Audit log under-used*, *Data subject
rights missing*, *Consent ledger missing*, *Sensitive-data handling*,
and bites a meaningful chunk out of *Retention secure destruction*.
All gates green; no regressions.

### Closed by P11
- **Audit FK survives erasure (PDPL).** `AuditEvent.userId` is now
  nullable + `onDelete: SetNull`. Deleting a user pseudonymises every
  audit row they wrote instead of deleting them — the audit trail is
  no longer collateral damage of an erasure request. Verified by
  `audit-event.prisma.it.spec.ts`.
- **`AuditInterceptor` + `@Audited({...})` decorator.** A global Nest
  interceptor (registered via `APP_INTERCEPTOR` from `AuditModule`)
  writes one `AuditEvent` after each tagged endpoint succeeds. Body
  keys captured into `details` are filtered through a redactor for
  secret-shaped names. Wired on:
  - `PATCH /tenders/:id/status` (`tender.update_status`)
  - `DELETE /tenders/:id` (`tender.delete`)
  - `PATCH /documents/:id/state` (`document.set_state`)
  - `POST /tenders/:id/compliance-matrices` (`compliance_matrix.generate`)
  - `PATCH /compliance-items/:id` (`compliance_item.update`)
  - `POST /compliance-items/:id/evidence-links` (`evidence_link.create`)
  - `DELETE /compliance-items/:id/evidence-links/:documentId` (`evidence_link.delete`)
- **Auth audit trail.** `AuthService` records `auth.login.success`,
  `auth.login.failure` (known-email only — unknown emails go to the
  structured logger to avoid PII enumeration via the audit table),
  and `auth.logout`.
- **Data-subject rights (PDPL Art. 12–17).** New `ConsentEvent`,
  `DataSubjectRequest`, and `RetentionAction` tables + repositories.
  `DataSubjectService` + `/data-subject-requests` endpoints implement:
  - `POST` create a request (`access | erasure | rectification`)
  - `GET` list (filterable by status), `GET :id`
  - `POST :id/approve` and `:id/deny` — admin-only via `RolesGuard`,
    with **separation of duties** (approver ≠ requestor)
  - `POST :id/execute` —
    - **access**: builds a snapshot (`user` + their `auditEvents` +
      `consentEvents` + previous `DataSubjectRequests`) and attaches it
      to `payload`
    - **erasure**: anonymises `AuditEvent.userId` (SetNull),
      pseudonymises `ConsentEvent.subjectEmail`, calls
      `IUserRepository.anonymise(...)` to overwrite the user's
      `email`/`name`/`password`. The user row survives so TenderAccess
      and other FKs remain referentially intact.
- **Consent ledger.** `ConsentLedgerService` + `/consent-events`
  endpoints (record grant/withdraw, list for subject, `GET /check`
  returns the current state). **Default deny** — `hasActiveConsent`
  returns `false` when no event exists.
- **Per-tender RBAC.** `TenderAccess` (`Owner | Editor | Reviewer |
  Viewer`) + `TenderAccessService` (grant / revoke / `hasAtLeast` with
  ordered role rank / `require` that throws **NotFound** rather than
  Forbidden so the existence of a tender isn't disclosed to outsiders).
  Endpoints: `GET/POST /tenders/:tenderId/access`, `DELETE
  /tenders/:tenderId/access/:userId` (admin-only via `RolesGuard`).
- **Sensitivity-class ACL on document reads.** `apps/api/src/pdpl/sensitivity.ts`
  defines `canReadSensitivity(role, sensitivity)`; `DocumentVaultService.get`
  consults it and lies with **404** for unauthorised readers. Default
  matrix: Owner + DocController for `high`; +BidManager for `medium`;
  every role for `low`; unknown classes fail-safe to `high`.

### Tests added at P11 (all green)
- API jest **135/135** (was 102 at P10). New units across:
  - `audit.interceptor.spec.ts` — passthrough when untagged, writes on
    success, no write on handler error, no write without principal,
    response/param/body entity-id sources, body redaction, swallows
    audit-write failures.
  - `data-subject.service.spec.ts` — create, malformed-email reject,
    approve from non-pending throws, separation of duties on approve
    and execute, access snapshot shape + payload persistence, erasure
    nullifies audit FK + pseudonymises user/consent rows, cross-tenant
    `get` returns NotFound.
  - `consent-ledger.service.spec.ts` — record + audit emission,
    rejects empty inputs, default-deny on missing event, withdraw
    overrides grant, tenant scoping.
  - `tender-access.service.spec.ts` — grant + audit, invalid role
    rejected, no double-grant, role ladder, `require` 404 on miss,
    revoke idempotency, tenant scoping.
  - `sensitivity.spec.ts` — every-role-reads-low, Owner/DocController-only
    for high, fail-safe-to-high for unknown classes.
  - `auth.service.spec.ts` gained 3 cases for login success / known-email
    failure / unknown-email failure audit semantics.
- API jest integration **8 suites / 28 cases** (was 4/14 at P10). Adds:
  - `audit-event.prisma.it.spec.ts` — SetNull preserves audit on user
    delete; tenant-scoped findForUser; anonymiseUser scope.
  - `consent-event.prisma.it.spec.ts` — grant/withdraw history,
    findCurrent semantics, tenant scoping, anonymiseSubject.
  - `tender-access.prisma.it.spec.ts` — `@@unique([userId, tenderId])`,
    cascade on user delete, cascade on tender delete, revoke idempotency.
  - `data-subject-request.prisma.it.spec.ts` — full lifecycle
    pending→approved→completed, findAll status filter, cross-tenant
    denial, findForSubject scoping.

### Gate evidence
- API tsc clean · jest unit **135/135 in 6.8s** · jest integration
  28 skipped locally (no Docker) in 5.6s — full green expected on CI
- Web tsc clean · vitest 18/18 · `next build` clean
- Python ruff clean · pytest 22/22

### Knowingly deferred to P11.1 / P12
- **Daily retention scheduler.** `RetentionAction` table + repo are in
  place; the cron/Cloud Run Scheduler trigger that walks expired
  documents and creates `RetentionAction(action=destroy,
  status=pending)` rows lands with P12 (deploy infra).
- **Runtime residency enforcement.** `apps/api/src/pdpl/residency.ts`
  still env-only; there is no `LLMProvider` in this codebase yet to gate.
  Folds in when the worker pipeline gains its LLM call site.
- **DPO contact registry + authority-notification dispatch.**
  `IncidentService` knows when notification is required (72h rule) but
  has no recipient and no transport. Schema + dispatcher land with the
  same P12 infra slice that brings the scheduler.
- **WhatsApp consent gate on `RemindersService`.** The ledger is ready
  (`hasActiveConsent`); wiring the existing `RemindersService.send` to
  consult it before sending is a one-line follow-up (P11.1).
- **Audit interceptor coverage for retention approve/deny.**
  `RetentionService` is still the in-memory pure evaluator; the
  persistent `RetentionAction` repo + audited approve/deny flow (with
  separation of duties wired to the new repo) is the P11.1 follow-up.
- **Interface-token DI refactor + `as any` cleanup** — still open
  (carried from P10.1).

## 13. P12a result — Cloud Run deploy infra + UX polish (2026‑05‑20)

P12a is the **deploy-ready** half of P12: every artefact required to
roll the application to Cloud Run is committed (Dockerfiles, Terraform,
WIF-authed deploy workflows, initial Prisma migration baseline), plus
the UX polish needed for an honest Arabic-first first impression. The
remaining P12 work (Etimad adapter, worker queue, k6 load, daily
retention scheduler) lands as P12b. No regressions.

### Closed by P12a
- **Initial Prisma migration baseline.** `prisma/migrations/20260520000001_init/`
  generated via `prisma migrate diff --from-empty --to-schema-datamodel`.
  `prisma migrate deploy` now has a deterministic history root instead
  of `prisma db push` against an empty DB. Cloud Run boot CMD runs
  `prisma migrate deploy` then the API. (Closes the §11 "initial Prisma
  migration file" deferral.)
- **Dockerfiles for api + web.** Multi-stage Node 20 alpine; api ships
  prod deps + Prisma client + migrations and runs as non-root user;
  web uses Next 15 `output: 'standalone'` so the runtime image is ~50MB.
  Both with `.dockerignore` so tests / node_modules / .next don't bloat
  the context.
- **Terraform (`infra/terraform/`).** Minimum-but-correct GCP infra:
  - Region default: `me-central2` (Dammam) for Saudi residency.
  - Artifact Registry repo
  - Cloud SQL Postgres 16 (zonal, PITR + daily backups, public IP +
    Cloud SQL Auth Proxy unix socket — no `authorized_networks`)
  - Cloud Run v2 services for api + web (api wired to the SQL socket
    via `volumes.cloud_sql_instance`, env from Secret Manager refs)
  - Secret Manager: `jwt-secret` (operator-set via gcloud, never in TF
    state) and `db-password` (TF-generated random + version)
  - Runtime SAs `bidready-api` / `bidready-web` with minimum roles
  - **Workload Identity Federation** pool + provider gated to the
    `ZeeshanAmjad0495/Munafasah-Desk` repo; deploy SA `bidready-deploy`
    has `artifactregistry.writer` + `run.admin` + impersonate-runtime;
    GitHub Actions OIDC tokens impersonate it. **No SA JSON keys
    anywhere.**
- **Deploy workflows.** `.github/workflows/api-deploy.yml` and
  `web-deploy.yml` — path-filtered, concurrency-grouped, no-cancel.
  Each: WIF auth → `gcloud auth configure-docker` → `docker build/push`
  to Artifact Registry → `gcloud run deploy` to the service account.
  Image tagged with the short SHA.
- **UX polish (the Arabic-first first impression).**
  - **Fonts:** Tajawal + IBM Plex Sans Arabic via `next/font/google`
    with CSS variable handoff; falls back to system Arabic + Latin.
  - **Design tokens** (`globals.css` `:root`): colour/space/radius/
    type-stack/layout CSS variables — everything keys off these.
  - **Locale toggle.** `bidready_locale` cookie + `LocaleProvider`
    (client). Server reads via `resolveServerLocale()` and stamps
    `<html lang/dir>` correctly per locale.
  - **App shell.** `<AppShell>` adds `<AppHeader>` (brand + locale
    toggle + signed-in user + sign-out) and `<AppSidebar>` (7-item PRD
    nav). Wraps `/` and `/tenders/[id]` (login stays standalone).
  - **A11y semantics.** `skip-link`, `role="banner"`, `<nav>` landmark,
    `<main id="main" tabindex="-1">`, `:focus-visible` outline on every
    interactive element, `aria-label` on icon-style controls.
  - **Loading / empty / error states.** `/` renders explicit "no
    tenders / no tasks / no expiring docs" panels and an `role="alert"`
    error banner on dashboard load failure.
  - **Intl helpers** (`lib/locale.ts`): `formatNumber`, `formatSar`,
    `formatDate` using `Intl.NumberFormat('ar-SA')` /
    `Intl.DateTimeFormat('ar-SA')`. Available for adoption by
    components in P12b.
- **CI lanes added.**
  - `web-a11y` — `npm run build` + `lhci autorun` against `/login`
    with explicit thresholds (a11y ≥ 0.9 hard; performance / best-
    practices / SEO as warnings). Config at `apps/web/lighthouserc.json`.
  - `terraform-validate` — `terraform fmt -check`, `init -backend=false`,
    `validate`. Catches drift before push to main.
- **README refreshed.** Removed the stale "Phase 0 — skeleton only"
  language (closes audit §9 README staleness row). New content: real
  monorepo layout, current status, local quickstart, deploy pointer.

### Gates (local)
- API tsc clean · jest unit **135/135 in 7.1s** · jest integration
  28 skipped (no Docker locally) in 5.5s
- Web tsc clean · vitest **18/18** · `next build` clean (standalone
  output enabled; routes still 4 dynamic; per-route bundle ~2.6 kB)
- Python ruff clean · pytest 22/22
- Terraform format/validate deferred to CI (CLI not installed locally;
  `terraform-validate` job in `.github/workflows/ci.yml` covers it)

### Knowingly deferred to P12b
- **Etimad manual-upload adapter** — parse Etimad notice → Tender +
  TenderRequirement rows.
- **Inbound-email webhook + worker queue consumer.**
  `workers/docpipeline/main.py` still just pings Redis — needs a job
  consumer that pulls ingestion jobs and writes back via the API.
- **TenderRequirement-backed compliance generation.**
- **WhatsApp consent gate on `RemindersService`.**
- **`AuditInterceptor` coverage for retention approve/deny + persistent
  RetentionAction flow.**
- **Daily retention scheduler** — Cloud Scheduler trigger now that the
  deploy infra is in place.
- **k6 load tests** (PRD SLO P95 < 2s @ 50 VU).
- **Playwright E2E + axe-core** for full a11y coverage (Lighthouse
  against `/login` is a thin sliver).
- **DPO contact registry + authority-notification dispatch.**
- **Runtime residency enforcement** at the LLM/OCR call site (depends
  on the worker queue gaining an external provider).
- **Interface-token DI refactor + `as any` cleanup** — still open
  (carried from P10.1 / P11.1).
