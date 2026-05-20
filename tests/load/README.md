# BidReady KSA — k6 load tests

PRD SLO: **P95 < 2s at 50 VU sustained for 1 minute** against the
dashboard load path (the most user-visible page).

## Run locally

```bash
# 1. Bring up the stack (api + web + postgres) — see infra/docker-compose.yml
# 2. Seed a test org and capture an admin session cookie:
curl -i -X POST http://localhost:8080/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@pilot.local","password":"pilot-dev-Owner"}'
# Grab the bidready_session cookie value from the Set-Cookie header.

# 3. Run k6 with the session cookie + base URL:
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e SESSION_COOKIE='paste-the-cookie-value-here' \
  tests/load/k6/dashboard.js
```

## CI

There is no CI job yet — the dashboard suite needs a running staging
environment (see [`infra/terraform/README.md`](../../infra/terraform/README.md)).
Once a staging URL is provisioned, a `web-load` job will run this on
every push to `main` and block on the SLO threshold.
