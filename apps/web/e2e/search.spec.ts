import { test, expect } from "@playwright/test";

test.describe("Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("should display the search page with all main elements", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Find Your Next Customers");
    await expect(page.getByPlaceholder(/B2B SaaS companies/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Search/ })).toBeVisible();
  });

  test("should show filters sidebar", async ({ page }) => {
    await expect(page.getByText("Industry")).toBeVisible();
    await expect(page.getByText("Ownership Type")).toBeVisible();
    await expect(page.getByText("Business Type")).toBeVisible();
  });

  test("should perform a search and display results", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("software companies hiring");
    await searchButton.click();

    await page.waitForTimeout(1000);

    await expect(page.getByText(/results found/)).toBeVisible();
  });

  test("should toggle between table and map view", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("software");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const mapTab = page.getByRole("tab", { name: /Map/ });
    await mapTab.click();

    await expect(page.locator("canvas, .maplibregl-canvas")).toBeVisible({ timeout: 10000 });

    const tableTab = page.getByRole("tab", { name: /Table/ });
    await tableTab.click();

    await expect(page.getByText("TechCorp Solutions").first()).toBeVisible();
  });

  test("should apply industry filter", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const softwareCheckbox = page.locator('label:has-text("Software Development")').locator('button[role="checkbox"]');
    await softwareCheckbox.click();

    await page.waitForTimeout(500);

    await expect(page.getByText(/results found/)).toBeVisible();
  });

  test("should apply ownership type filter", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const privateCheckbox = page.locator('label:has-text("Private")').filter({ has: page.locator('button[role="checkbox"]') }).locator('button[role="checkbox"]');
    await privateCheckbox.click();

    await page.waitForTimeout(500);

    await expect(page.getByText(/results found/)).toBeVisible();
  });

  test("should toggle hiring filter flag", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const hiringSwitch = page.locator('label:has-text("Currently Hiring")').locator('button[role="switch"]');
    await hiringSwitch.click();

    await page.waitForTimeout(500);

    await expect(page.getByText(/results found/)).toBeVisible();
  });

  test("should select a tech stack tag", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    await page.locator('button:has-text("React")').first().click();

    await page.waitForTimeout(500);

    await expect(page.getByText(/results found/)).toBeVisible();
  });

  test("should clear all filters", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const softwareCheckbox = page.locator('label:has-text("Software Development")').locator('button[role="checkbox"]');
    await softwareCheckbox.click();

    await page.waitForTimeout(500);

    const clearButton = page.getByRole("button", { name: /Clear all/ });
    await clearButton.click();

    await page.waitForTimeout(500);

    await expect(page.getByText(/results found/)).toBeVisible();
  });

  test("should select a prospect card", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const firstProspect = page.locator("div").filter({ hasText: /TechCorp Solutions/ }).first();
    await firstProspect.click();

    await expect(firstProspect).toHaveClass(/border-zinc-900/);
  });

  test("should save search", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("software companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const saveButton = page.getByRole("button", { name: /Save search/ });
    await saveButton.click();

    await page.waitForTimeout(1000);

    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });

  test("should add to list", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });

    await searchInput.fill("companies");
    await searchButton.click();

    await page.waitForTimeout(1000);

    const addToListButton = page.getByRole("button", { name: /Add to list/ });
    await addToListButton.click();

    await page.waitForTimeout(1000);

    await expect(page.getByText(/added to list/i)).toBeVisible();
  });
});
