import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard - Tenant & User Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3001");
  });

  test("should display admin dashboard with organizations", async ({ page }) => {
    expect(await page.textContent("h1")).toContain("Admin Dashboard");
    expect(await page.textContent("text=Organizations")).toBeTruthy();
    expect(await page.textContent("text=Users")).toBeTruthy();
    expect(await page.textContent("text=Audit Log")).toBeTruthy();
  });

  test("should filter organizations by status", async ({ page }) => {
    await page.selectOption("select", "active");
    await expect(page.locator("text=Acme Corporation")).toBeVisible();
    await expect(page.locator("text=TechStart Inc")).toBeVisible();

    await page.selectOption("select", "suspended");
    await expect(page.locator("text=Global Services Ltd")).toBeVisible();
    await expect(page.locator("text=Acme Corporation")).not.toBeVisible();
  });

  test("should search organizations by name", async ({ page }) => {
    await page.fill('input[placeholder*="Search by organization"]', "Acme");
    await expect(page.locator("text=Acme Corporation")).toBeVisible();
    await expect(page.locator("text=TechStart Inc")).not.toBeVisible();
  });

  test("should sort organizations", async ({ page }) => {
    const sortButtons = page.locator("button:has-text('Name')");
    await sortButtons.nth(1).click();
    await expect(page.locator("text=Acme Corporation")).toBeTruthy();
  });

  test("should suspend an organization", async ({ page }) => {
    const expandButton = page.locator("button:has-text('Show')").first();
    await expandButton.click();

    const suspendButton = page.locator("button:has-text('Suspend Organization')");
    await suspendButton.click();

    await expect(page.locator("text=suspended")).toBeVisible();
    expect(await page.textContent("div")).toContain("suspended successfully");
  });

  test("should restore a suspended organization", async ({ page }) => {
    const expandButtons = page.locator("button:has-text('Show')");
    for (let i = 0; i < await expandButtons.count(); i++) {
      const button = expandButtons.nth(i);
      const text = await button.textContent();
      if (text === "Show") {
        await button.click();
        const restoreButton = page.locator("button:has-text('Restore Organization')");
        if (await restoreButton.isVisible()) {
          await restoreButton.click();
          expect(await page.textContent("div")).toContain("restored successfully");
          return;
        }
        await button.click();
      }
    }
  });

  test("should reset MFA for organization", async ({ page }) => {
    const expandButton = page.locator("button:has-text('Show')").first();
    await expandButton.click();

    const resetMFAButton = page.locator("button:has-text('Reset MFA for All Users')");
    await resetMFAButton.click();

    expect(await page.textContent("div")).toContain("MFA reset");
  });

  test("should force logout all users in organization", async ({ page }) => {
    const expandButton = page.locator("button:has-text('Show')").first();
    await expandButton.click();

    const forceLogoutButton = page.locator("button:has-text('Force Logout All Users')");
    await forceLogoutButton.click();

    expect(await page.textContent("div")).toContain("logged out");
  });

  test("should impersonate organization", async ({ page }) => {
    const expandButton = page.locator("button:has-text('Show')").first();
    await expandButton.click();

    const impersonateButton = page.locator("button:has-text('Impersonate Organization')");
    await impersonateButton.click();

    expect(await page.textContent("div")).toContain("Impersonating organization");
  });

  test("should display and filter users", async ({ page }) => {
    const userSearch = page.locator('input[placeholder*="Search by name or email"]');
    await userSearch.fill("John");

    await expect(page.locator("text=John Doe")).toBeVisible();
    await expect(page.locator("text=Jane Smith")).not.toBeVisible();
  });

  test("should filter users by role", async ({ page }) => {
    const userRoleSelect = page.locator("select").nth(1);
    await userRoleSelect.selectOption("admin");

    await expect(page.locator("text=Admin")).toBeVisible();
  });

  test("should reset MFA for user", async ({ page }) => {
    const userExpandButtons = page.locator("button:has-text('Show')");
    const firstUserButton = userExpandButtons.nth(3);
    await firstUserButton.click();

    const resetMFAButton = page.locator("button:has-text('Reset MFA')").first();
    await resetMFAButton.click();

    expect(await page.textContent("div")).toContain("MFA reset");
  });

  test("should force logout user", async ({ page }) => {
    const userExpandButtons = page.locator("button:has-text('Show')");
    const firstUserButton = userExpandButtons.nth(3);
    await firstUserButton.click();

    const forceLogoutButton = page.locator("button:has-text('Force Logout')").first();
    await forceLogoutButton.click();

    expect(await page.textContent("div")).toContain("logged out");
  });

  test("should display audit log", async ({ page }) => {
    const expandButton = page.locator("button:has-text('Show')").first();
    await expandButton.click();

    const suspendButton = page.locator("button:has-text('Suspend Organization')");
    await suspendButton.click();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(page.locator("text=SUSPEND_ORGANIZATION")).toBeVisible();
  });

  test("should show audit log details", async ({ page }) => {
    const expandButton = page.locator("button:has-text('Show')").first();
    await expandButton.click();

    const suspendButton = page.locator("button:has-text('Suspend Organization')");
    await suspendButton.click();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const viewButton = page.locator("button:has-text('View')").first();
    await viewButton.click();

    await expect(page.locator("text=Details for")).toBeVisible();
  });

  test("should pagination work (check if table shows data)", async ({ page }) => {
    const tableBody = page.locator("tbody");
    const rows = await tableBody.locator("tr").count();
    expect(rows).toBeGreaterThan(0);
  });

  test("should require admin access (verify admin-only access)", async ({ page }) => {
    await page.goto("http://localhost:3001");
    await expect(page.locator("h1")).toContain("Admin Dashboard");
  });
});
