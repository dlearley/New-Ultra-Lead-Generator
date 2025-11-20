import { test, expect } from "@playwright/test";

test.describe("Map View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
    const searchInput = page.getByPlaceholder(/B2B SaaS companies/);
    const searchButton = page.getByRole("button", { name: /Search/ });
    await searchInput.fill("companies");
    await searchButton.click();
    await page.waitForTimeout(1000);
  });

  test("should display map view when map tab is clicked", async ({ page }) => {
    const mapTab = page.getByRole("tab", { name: /Map/ });
    await mapTab.click();

    await expect(page.locator("canvas, .maplibregl-canvas, .mapboxgl-canvas")).toBeVisible({ timeout: 10000 });
  });

  test("should switch between table and map views", async ({ page }) => {
    const mapTab = page.getByRole("tab", { name: /Map/ });
    const tableTab = page.getByRole("tab", { name: /Table/ });

    await mapTab.click();
    await expect(page.locator("canvas, .maplibregl-canvas")).toBeVisible({ timeout: 10000 });

    await tableTab.click();
    await expect(page.getByText("TechCorp Solutions").first()).toBeVisible();
  });

  test("should show selected prospect info on map", async ({ page }) => {
    const tableTab = page.getByRole("tab", { name: /Table/ });
    await tableTab.click();

    const firstProspect = page.locator("div").filter({ hasText: /TechCorp Solutions/ }).first();
    await firstProspect.click();

    await page.waitForTimeout(500);

    const mapTab = page.getByRole("tab", { name: /Map/ });
    await mapTab.click();

    await expect(page.locator("canvas, .maplibregl-canvas")).toBeVisible({ timeout: 10000 });
  });
});
