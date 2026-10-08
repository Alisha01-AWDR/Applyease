import { expect, Page } from '@playwright/test';

/** Sign in with the built-in demo candidate (fills account + profile). */
export async function signInDemo(page: Page, then = '/dashboard') {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Use demo candidate' }).click();
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  if (then !== '/dashboard') await page.goto(then);
}


export async function resetDemoState(page: Page) {
  const token = process.env.TEST_RESET_TOKEN;
  const api = process.env.VITE_API_URL || 'http://127.0.0.1:8000';
  if (!token) return;
  const response = await page.request.post(`${api}/__test__/reset`, { headers: { 'X-Test-Reset-Token': token } });
  expect(response.ok()).toBeTruthy();
}
