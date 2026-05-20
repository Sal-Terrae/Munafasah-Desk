# Playwright E2E

Currently exercises:

- The unauthenticated redirect to `/login`.
- That `<html lang="ar" dir="rtl">` is stamped correctly on the server.
- That the login form renders with the right labels + focusable controls.
- That `@axe-core/playwright` reports **zero** critical/serious WCAG 2.1
  AA violations on the login page.
- That the locale toggle persists via the `bidready_locale` cookie.

The seeded-login → dashboard happy path is **deferred until a staging
environment is wired** in CI (needs a pre-populated org + admin user).

## Run locally

```bash
# in one shell — start the api + web
docker compose -f infra/docker-compose.yml up -d
JWT_SECRET="$(openssl rand -base64 48)" \
  DATABASE_URL=postgresql://bidready:bidready_dev_pw@localhost:5432/bidready \
  CORS_ORIGIN=http://localhost:3000 \
  npm run dev:api &
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev:web &

# in another shell — install browsers + run the suite
npx --workspace apps/web playwright install chromium
npm --workspace apps/web run test:e2e
```
