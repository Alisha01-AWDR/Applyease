import { expect, test } from '@playwright/test';
import { resetDemoState, signInDemo } from './helpers';

test.beforeEach(async ({ page }) => { await resetDemoState(page); });

test('app pages require sign-in and return you afterwards', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole('button', { name: 'Use demo candidate' }).click();
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/jobs$/);
});

test('full journey: onboard → find → understand → apply → review → confirm → receipt → tracker', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Start with ApplyEase/ }).click();
  await expect(page.getByRole('heading', { name: 'How would you like to use ApplyEase?' })).toBeVisible();
  await page.getByRole('button', { name: /Keyboard/ }).click();
  await page.getByRole('link', { name: /^Continue/ }).click();

  // The seeded demo account already exists in the Phase 10 backend, so use the real login path.
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Use demo candidate' }).click();
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Asha');
  await expect(page.getByText('No application in progress')).toBeVisible();
  // The chosen mode is shown in the top bar.
  await expect(page.getByRole('button', { name: /Keyboard mode/ })).toBeVisible();

  await page.getByRole('link', { name: 'Find jobs', exact: true }).click();
  await page.getByLabel('What kind of work are you looking for?').fill('Acme');
  await page.getByLabel('What kind of work are you looking for?').press('Enter');
  await page.getByRole('link', { name: /Understand this job/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Data Analyst');

  await page.getByRole('link', { name: /Apply with ApplyEase/ }).first().click();
  await expect(page).toHaveURL(/\/apply\/acme-data\/1$/);
  await expect(page.getByText('Step 1 of 7').first()).toBeVisible();

  const next = page.getByRole('button', { name: 'Next' });
  await next.click(); // name
  await next.click(); // email
  await next.click(); // phone (prefilled from demo profile)
  await next.click(); // resume

  // Choice step: cannot continue without an answer.
  await expect(page.getByRole('heading', { name: /authorized to work/ })).toBeVisible();
  await next.click();
  await expect(page.getByRole('alert')).toContainText('Please choose one of the answers.');
  await page.getByLabel('Yes', { exact: true }).check();
  await next.click();

  // Long answer: required, minimum length.
  await next.click();
  await expect(page.getByRole('alert')).toContainText('Please write a few words');
  await page.getByRole('textbox', { name: 'Why are you interested in this role?' }).fill('I enjoy turning messy data into clear decisions for teams.');
  await next.click();

  await page.getByRole('button', { name: 'Review application' }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByRole('heading', { name: 'Check everything before you submit.' })).toBeVisible();
  await page.getByRole('button', { name: /Continue to confirmation/ }).click();

  const submit = page.getByRole('button', { name: 'Submit application' });
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Yes, I want to submit this application/).check();
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/receipt$/);
  await expect(page.getByRole('heading', { name: 'Your application is on its way.' })).toBeVisible();
  await expect(page.getByText(/AE-\d{4}-\d{5}/)).toBeVisible();

  await page.getByRole('button', { name: /View application/ }).click();
  await expect(page.getByText('Submitted', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Reference AE-/)).toBeVisible();
  // The submitted draft is gone, so no stray "Draft" row remains.
  await expect(page.getByText(/Draft · Step/)).toHaveCount(0);
});

test('drafts save, resume at the right step, and Review edit links open the right question', async ({ page }) => {
  await signInDemo(page, '/apply/acme-data/3');
  const phone = page.getByRole('textbox', { name: 'What is your phone number?' });
  await phone.fill('98765 43211');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/apply\/acme-data\/4$/);

  await page.goto('/dashboard');
  await expect(page.getByText("You're on step 4 of 7")).toBeVisible();
  await page.getByRole('link', { name: /Continue application/ }).click();
  await expect(page).toHaveURL(/\/apply\/acme-data\/4$/);

  // Answer typed before navigating away is kept (autosave flush).
  await page.goto('/apply/acme-data/3');
  await expect(phone).toHaveValue('98765 43211');

  await page.goto('/apply/acme-data/review');
  await page.getByRole('link', { name: 'Edit answer: What is your phone number?' }).click();
  await expect(page).toHaveURL(/\/apply\/acme-data\/3$/);
  await expect(page.getByRole('heading', { name: 'What is your phone number?' })).toBeVisible();
});

test('Confirm and Receipt cannot be reached without the required answers or a submission', async ({ page }) => {
  await signInDemo(page, '/apply/acme-data/confirm');
  await expect(page).toHaveURL(/\/review$/); // missing answers → back to review
  await page.goto('/apply/acme-data/receipt');
  await expect(page).toHaveURL(/\/jobs\/acme-data$/); // no submission → no receipt
});

test('unknown job and bad step are handled', async ({ page }) => {
  await signInDemo(page, '/jobs/does-not-exist');
  await expect(page.getByRole('heading', { name: 'We could not find that job.' })).toBeVisible();
  await page.goto('/apply/acme-data/99');
  await expect(page).toHaveURL(/\/apply\/acme-data\/1$/);
});

test('Accessibility panel opens from the top bar, Escape closes it and returns focus', async ({ page }) => {
  await signInDemo(page);
  const pill = page.getByRole('button', { name: /Open accessibility controls/ });
  await pill.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close accessibility controls' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Large text' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-large', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(pill).toBeFocused();
});

test('skip link is the first tab stop', async ({ page }) => {
  await signInDemo(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
});

test('profile edits persist and drive completion', async ({ page }) => {
  await signInDemo(page, '/profile');
  await expect(page.getByText('4 of 5 areas ready')).toBeVisible();
  await page.getByRole('button', { name: /Add experience/ }).click();
  await expect(page.getByLabel('Experience')).toBeFocused();
  await page.getByLabel('Experience').fill('Intern, data team');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('5 of 5 areas ready')).toBeVisible();
  await page.reload();
  await expect(page.getByText('5 of 5 areas ready')).toBeVisible();
});

test('settings: sign out returns to login and locks the app again', async ({ page }) => {
  await signInDemo(page, '/settings');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('schema-driven wizard changes per job and external jobs use only the Application Kit', async ({ page }) => {
  await signInDemo(page, '/jobs/northstar-ux');
  await expect(page.getByRole('heading', { name: 'UX Research Intern' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Application Kit' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Apply with ApplyEase|Start application|Continue application/ })).toHaveCount(0);
  await page.goto('/apply/northstar-ux/1');
  await expect(page.getByText('Step 1 of 6')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'What email should the employer use?' })).toBeVisible();
  await page.goto('/apply/northstar-ux/4');
  await expect(page.getByRole('heading', { name: 'Are you currently a student or recent graduate?' })).toBeVisible();
  await expect(page.getByLabel('Prefer not to say', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Prefer not to say', { exact: true })).not.toBeChecked();
});
