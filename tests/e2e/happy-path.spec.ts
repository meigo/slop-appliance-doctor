import { test, expect } from '@playwright/test';

test('capture page renders and the submit button starts disabled', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Appliance Troubleshooter' })).toBeVisible();
  await expect(page.getByPlaceholder(/What's it doing/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Whirlpool WDT780SAEM/i)).toBeVisible();
  await expect(page.getByPlaceholder(/LE, F21, dE/i)).toBeVisible();

  const submit = page.getByRole('button', { name: /^Diagnose$/i });
  await expect(submit).toBeDisabled();
});

test('example page renders an appliance diagnosis', async ({ page }) => {
  await page.goto('/example');

  await expect(page.getByText('Drain pump failure')).toBeVisible();
  await expect(page.getByText(/W10348269/)).toBeVisible();
  await expect(page.getByText(/DIY steps/i)).toBeVisible();
});

test('non-existent diagnosis ID renders error page', async ({ page }) => {
  await page.goto('/d/zzzzzzzz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/diagnose a new appliance/i)).toBeVisible({ timeout: 5000 });
});
