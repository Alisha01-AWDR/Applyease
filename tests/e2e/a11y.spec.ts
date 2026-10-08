import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signInDemo } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: import('@playwright/test').Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`);
  expect(summary, `axe violations on ${name}`).toEqual([]);
}

for (const path of ['/', '/welcome', '/login', '/signup']) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await scan(page, path);
  });
}

for (const path of [
  '/dashboard',
  '/jobs',
  '/jobs/acme-data',
  '/jobs/import',
  '/apply/acme-data/1',
  '/apply/acme-data/5',
  '/apply/acme-data/review',
  '/applications',
  '/application-kit/acme-data',
  '/profile',
  '/accessibility',
  '/settings',
]) {
  test(`axe: ${path}`, async ({ page }) => {
    await signInDemo(page, path);
    await scan(page, path);
  });
}
