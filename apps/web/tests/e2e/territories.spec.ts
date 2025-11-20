import { test, expect } from '@playwright/test';

test.describe('Territory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/map');
  });

  test('should display territories page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Territory Management');
    await expect(page.locator('.btn-primary')).toContainText('Create Territory');
  });

  test('should create a new territory', async ({ page }) => {
    // Click create button
    await page.click('.btn-primary');

    // Fill form
    await page.fill('input[placeholder="Enter territory name"]', 'Test Territory');
    await page.selectOption('select', 'state');

    // Submit
    await page.click('button:has-text("Create Territory")');

    // Verify territory appears in list
    await expect(page.locator('.territory-name')).toContainText('Test Territory');
  });

  test('should select territory', async ({ page }) => {
    // Click create button
    await page.click('.btn-primary');

    // Fill and create
    await page.fill('input[placeholder="Enter territory name"]', 'Test Territory');
    await page.click('button:has-text("Create Territory")');

    // Wait for territory to appear
    await page.waitForSelector('.territory-item');

    // Click territory
    await page.click('.territory-item');

    // Verify active state
    await expect(page.locator('.territory-item.active')).toBeVisible();
  });

  test('should display map', async ({ page }) => {
    await expect(page.locator('#map')).toBeVisible();
  });
});
