# Local Infrastructure — Cloud-Ready Setup

The project runs entirely on local Docker today. Every external dependency
sits behind a provider abstraction so cloud migration is a config flip, not
a code change.

## Stack at a glance

| Concern | Local (now) | Cloud (later, config flip) | Abstraction |
|---|---|---|---|
| DB | Postgres 16 (compose) | Cloud SQL / RDS / Supabase | Prisma repos + tokens |
| Object store | MinIO (compose) | GCS / S3 / R2 | `IObjectStorageProvider` |
| Queue | Redis + BullMQ (compose; opt-in) | Memorystore / Upstash | `IQueueProvider` |
| Workflow | n8n self-hosted (compose) | n8n Cloud / Temporal | n8n webhook URL |
| LLM | DeepSeek API (primary) + Ollama (fallback) | OpenAI / Anthropic / Vertex | `ILlmProvider` |
| Notifications | console (default) | SMTP / Slack / WhatsApp | `INotificationProvider` |
| Metrics | Prometheus (compose) | Grafana Cloud / Datadog | `/metrics` endpoint |
| Dashboards | Grafana (compose) | Grafana Cloud | n/a |
| Secrets | `.env` + chmod 600 | Secret Manager / Vault | (read directly today) |

## Bring up the stack

Default — no optional LLM, no Meilisearch/Qdrant:

```bash
docker compose -f infra/docker-compose.yml up -d
```

With local LLM fallback (Ollama):

```bash
docker compose -f infra/docker-compose.yml --profile optional-local-llm up -d
```

## Service map

| Service | Port | Purpose |
|---|---|---|
| postgres | 5432 | App DB (Prisma) |
| redis | 6379 | BullMQ + cache |
| minio | 9000 (api), 9001 (console) | Document blobs |
| n8n | 5678 | Workflow / webhook receiver |
| prometheus | 9090 | Metrics scrape |
| grafana | 3001 | Dashboards |
| ollama | 11434 | Local LLM (opt-in) |

## LLM provider — DeepSeek primary, Ollama fallback

Set `LLM_PROVIDER=deepseek` + `DEEPSEEK_API_KEY` for hosted use. Without a
key, the factory silently falls back to the deterministic mock so the API
boots clean and tests stay green.

`BudgetGuardService.assertCanSpend(orgId)` reads the daily aggregate from
`LlmUsageLog` and **fails closed** when `LLM_DAILY_MAX_REQUESTS` or
`LLM_DAILY_MAX_COST_USD` are reached. The guard never auto-resets a
blocked org — operators clear the cap by raising the limit or waiting
for UTC midnight rollover.

`LlmUsageService.recordOk` writes one usage row per call. Cost is
computed from a per-provider/per-model rate-card sourced from env; for
DeepSeek the defaults track published pricing (USD per 1k tokens).

Verify the wiring before kicking off real runs (sector classification,
ingestion, etc.):

```bash
cd apps/api && npm run smoke:llm
```

Exit `0` = wiring OK, `1` = network failure, `2` = model returned
malformed JSON. In mock mode (default) the script exits 0 with an
explanatory note — useful for confirming the dev install works
without a DeepSeek key.

## Ingestion portal (server-to-server)

The `POST /ingestion/tenders` endpoint accepts enriched tenders
pushed from the [bidready-tender-ingestion](https://github.com/Sal-Terrae/bidready-tender-ingestion)
sibling service. Auth: a single bearer token in `INGESTION_API_KEY`;
the resulting Tender lands in the org identified by
`INGESTION_TARGET_ORG_ID`. Both env vars MUST be set in production —
missing config locks the endpoint with a 401.

The ingestion service should mirror its `ADMIN_PORTAL_API_KEY` to
match. (Per-org keys are a follow-up when a second customer needs
their own ingestion target.)

## Cloud migration plan

Each box flips by env, not by code:

| From | To | Change |
|---|---|---|
| MinIO | AWS S3 | `OBJECT_STORE_ENDPOINT=s3.<region>.amazonaws.com`, `OBJECT_STORE_USE_SSL=true` |
| Redis local | Managed Redis | `REDIS_URL=rediss://…` |
| Postgres local | Cloud SQL | `DATABASE_URL=postgresql://…` |
| DeepSeek | OpenAI | swap factory branch + env (no consumer change) |
| Console notify | SMTP / Slack | add driver under `providers/notifications/`, bind to token |
| n8n self-hosted | n8n Cloud | `N8N_BASE_URL=https://…cloud.n8n.io` |
| `.env` secrets | Secret Manager | wire a real `SecretProvider` (deferred — see below) |

## Deliberately not abstracted yet

The following were considered for Workstream A but **deferred until a
real caller exists**, to avoid speculative abstractions:

- **SearchProvider** — nothing in the API does full-text search today.
  Will land with the sector classifier or ingestion search if needed.
- **OCRProvider** — no caller for OCR yet; the ingestion repo will add
  Tesseract there.
- **SecretProvider** — config still reads `process.env` directly. We'll
  introduce a `SecretProvider` when the first cloud target is provisioned
  so the interface is shaped by real Secret Manager / Vault behavior, not
  a guess.

Each can be added incrementally without breaking what's already in.
