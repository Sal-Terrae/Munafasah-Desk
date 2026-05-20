import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Happy-path E2E: visiting any protected route while signed-out redirects
 * to /login, the login form renders correctly in Arabic-RTL, and axe
 * reports no critical / serious WCAG 2.1 AA violations.
 *
 * Auth-completion flow (submit → redirected to dashboard) is not exercised
 * here because it needs a seeded org + admin user in a live DB. Once a
 * staging environment is wired in CI, the full login flow joins this file.
 */
test('unauthenticated visit redirects to /login (RTL, Arabic, a11y-clean)', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login(\?|$)/);

  // RTL + locale stamped on <html>
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');

  // Form lands. Labels are Arabic; the input ids are stable.
  await expect(page.locator('input#email')).toBeVisible();
  await expect(page.locator('input#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  // Accessibility budget: zero critical/serious violations on /login.
  const accessibilityResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const blocking = accessibilityResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(
    blocking,
    `Blocking a11y violations: ${blocking.map((v) => `${v.id} (${v.impact})`).join(', ')}`,
  ).toEqual([]);
});

test('locale toggle switches dir/lang and persists via cookie', async ({
  page,
  context,
}) => {
  await page.goto('/login');
  // The toggle reads "English" when locale is Arabic, "العربية" otherwise.
  const toggle = page.getByRole('button', { name: /English|العربية/ });
  await expect(toggle).toBeVisible();

  await toggle.click();

  // After click, html dir should be ltr (English) and the cookie is set.
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'bidready_locale')?.value).toBe(
    'en',
  );
});
