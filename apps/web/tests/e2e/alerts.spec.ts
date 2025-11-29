import { test, expect } from '@playwright/test';

test.describe('Alert Management', () => {
  test.beforeEach(async ({ page }) => {
    // First create a territory
    await page.goto('http://localhost:3000/map');
    await page.click('.btn-primary');
    await page.fill('input[placeholder="Enter territory name"]', 'Test Territory');
    await page.click('button:has-text("Create Territory")');
    await page.waitForTimeout(500);

    // Navigate to alerts
    await page.goto('http://localhost:3000/alerts');
  });

  test('should display alerts page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Alert Manager');
    await expect(page.locator('.btn-primary')).toContainText('Create Alert');
  });

  test('should create a new alert', async ({ page }) => {
    // Click create button
    await page.click('.btn-primary');

    // Fill form
    await page.fill('input[placeholder="Enter alert name"]', 'Test Alert');
    await page.selectOption('select:has-option(label="Test Territory")', 'test-territory-id');
    await page.selectOption('select[id="cadence"]', 'daily');

    // Submit
    await page.click('button:has-text("Create Alert")');

    // Verify alert appears in list
    await expect(page.locator('.alert-name')).toContainText('Test Alert');
  });

  test('should select alert and display run history', async ({ page }) => {
    // Create alert first
    await page.click('.btn-primary');
    await page.fill('input[placeholder="Enter alert name"]', 'Test Alert');
    await page.click('button:has-text("Create Alert")');

    // Wait and click alert
    await page.waitForSelector('.alert-item');
    await page.click('.alert-item');

    // Verify active state
    await expect(page.locator('.alert-item.active')).toBeVisible();

    // Verify run history section appears
    await expect(page.locator('.alert-run-history')).toBeVisible();
  });

  test('should trigger alert', async ({ page }) => {
    // Create alert
    await page.click('.btn-primary');
    await page.fill('input[placeholder="Enter alert name"]', 'Test Alert');
    await page.click('button:has-text("Create Alert")');

    // Wait and click trigger
    await page.waitForSelector('button:has-text("Trigger")');
    await page.click('button:has-text("Trigger")');

    // Verify run appears in history
    await page.waitForSelector('.run-item');
    await expect(page.locator('.run-item')).toBeVisible();
  });

  test('should show alert run status', async ({ page }) => {
    // Create and trigger alert
    await page.click('.btn-primary');
    await page.fill('input[placeholder="Enter alert name"]', 'Test Alert');
    await page.click('button:has-text("Create Alert")');

    await page.waitForSelector('button:has-text("Trigger")');
    await page.click('button:has-text("Trigger")');

    // Check for status badge
    await page.waitForSelector('.badge');
    await expect(page.locator('.badge')).toBeVisible();
  });
});
