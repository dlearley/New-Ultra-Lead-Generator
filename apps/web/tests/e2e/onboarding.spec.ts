import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/onboarding');
  });

  test('should display onboarding page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Organization Setup');
    await expect(page.locator('.onboarding-wizard')).toBeVisible();
  });

  test('should display step 1 - Industries', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Industries');
    await expect(page.locator('.options')).toBeVisible();
    await expect(page.locator('label')).toContainText('Technology');
  });

  test('should select industries', async ({ page }) => {
    // Select Technology and Finance
    await page.click('label:has-text("Technology")');
    await page.click('label:has-text("Finance")');

    // Verify checkboxes are checked
    const techCheckbox = page.locator('input[type="checkbox"]:first-of-type');
    await expect(techCheckbox).toBeChecked();

    // Click next
    await page.click('button:has-text("Next")');

    // Verify on step 2
    await expect(page.locator('h2')).toContainText('Geographies');
  });

  test('should navigate through all steps', async ({ page }) => {
    const stepTitles = ['Industries', 'Geographies', 'Deal Sizes', 'Personas'];

    for (let i = 0; i < stepTitles.length - 1; i++) {
      // Verify current step
      await expect(page.locator('h2')).toContainText(stepTitles[i]);

      // Select first option
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();

      // Click next
      await page.click('button:has-text("Next")');
    }

    // Verify last step
    await expect(page.locator('h2')).toContainText(stepTitles[3]);
  });

  test('should complete onboarding', async ({ page }) => {
    const stepTitles = ['Industries', 'Geographies', 'Deal Sizes', 'Personas'];

    // Go through all steps and select options
    for (let i = 0; i < stepTitles.length - 1; i++) {
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      await page.click('button:has-text("Next")');
    }

    // On last step, select an option and complete
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();

    // Click complete
    await page.click('button:has-text("Complete Setup")');

    // Verify completion (page should update or redirect)
    await page.waitForTimeout(500);
    await expect(page.locator('h1')).toContainText('Organization Setup');
  });

  test('should show progress bar', async ({ page }) => {
    const progressBar = page.locator('.progress-bar');
    await expect(progressBar).toBeVisible();

    // Verify progress text
    await expect(page.locator('.progress-text')).toContainText('Step 1 of 4');

    // Go to next step
    await page.click('input[type="checkbox"]').first();
    await page.click('button:has-text("Next")');

    // Verify progress updated
    await expect(page.locator('.progress-text')).toContainText('Step 2 of 4');
  });

  test('should disable previous button on first step', async ({ page }) => {
    const prevButton = page.locator('button:has-text("Previous")');
    await expect(prevButton).toBeDisabled();
  });

  test('should enable previous button after first step', async ({ page }) => {
    // Go to next step
    await page.click('input[type="checkbox"]').first();
    await page.click('button:has-text("Next")');

    // Previous button should be enabled
    const prevButton = page.locator('button:has-text("Previous")');
    await expect(prevButton).toBeEnabled();

    // Go back
    await prevButton.click();

    // Verify back on first step
    await expect(page.locator('h2')).toContainText('Industries');
  });
});
