import { defineConfig, devices } from '@playwright/test';

// E2E config. Defaults assume the api + web are running locally
// (see tests/load/README.md for a similar bootstrap recipe — start
// docker-compose, run `npm run dev:api` + `npm run dev:web`, seed a
// pilot user). CI integration arrives once a staging URL is available.

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
