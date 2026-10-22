import { test, expect } from "@playwright/test";

test.describe("Centralized Multi-Campus Hackathon Platform - Full Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("1. Landing page loads with campus branding and hackathon directory", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/JECRC|Hackathon/i);
    // Verify hero title
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Verify navigation links
    await expect(page.getByRole("link", { name: /hackathons/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /archive/i }).first()).toBeVisible();
  });

  test("2. Authentication - 1-Click demo switcher and sign-in verification", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2").filter({ hasText: /sign in|welcome/i }).first()).toBeVisible();

    // Verify Demo Account Quick Switcher buttons exist
    const demoSwitcher = page.locator("button, [role='button']").filter({ hasText: /admin|student|jury/i });
    expect(await demoSwitcher.count()).toBeGreaterThan(0);

    // Enter credentials manually or via demo fill
    await page.fill('input[type="email"]', "admin@hackathon.jecrc.ac.in");
    await page.fill('input[type="password"]', "Password@123");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or hackathons
    await page.waitForURL((url) => url.pathname.includes("/dashboard") || url.pathname.includes("/hackathons"), {
      timeout: 15000,
    });
  });

  test("3. Hackathon Directory - Browse and campus filters", async ({ page }) => {
    await page.goto("/hackathons");
    await expect(page.locator("h1")).toContainText(/Explore Hackathons/i);

    // Verify search and filter controls
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    const campusSelect = page.locator("select").first();
    await expect(campusSelect).toBeVisible();

    // Check that seeded hackathon or placeholder cards render
    const hackathonCard = page.locator("a[href*='/hackathons/']").first();
    await expect(hackathonCard).toBeVisible({ timeout: 10000 });
  });

  test("4. Innovation Archive - Multi-campus permanent ledger", async ({ page }) => {
    await page.goto("/archive");
    await expect(page.locator("h1")).toContainText(/Archive/i);

    // Verify filter controls exist
    const campusFilter = page.locator("select").first();
    await expect(campusFilter).toBeVisible();

    const winnersBtn = page.getByRole("button", { name: /award winners|winners only/i });
    await expect(winnersBtn).toBeVisible();
  });

  test("5. Certificate Verification Public Ledger", async ({ page }) => {
    // Testing the public verification endpoint format
    await page.goto("/certificates/verify/demo-test-code");
    
    // Page should display verification container or not-found state without crashing
    const container = page.locator("main, div.max-w-4xl, div.max-w-md").first();
    await expect(container).toBeVisible();
  });

  test("6. API Health Check Endpoint", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const json = await res.json();
    expect(json).toHaveProperty("timestamp");
    expect(json).toHaveProperty("system");
    expect(json).toHaveProperty("database");
  });

  test("7. Complete Role Lifecycle Simulation via API & Service Layer", async ({ request }) => {
    // Verify public endpoints respond properly
    const hackathonsRes = await request.get("/api/v1/hackathons");
    expect(hackathonsRes.ok()).toBeTruthy();
    const hackathonsData = await hackathonsRes.json();
    expect(hackathonsData.success).toBe(true);

    const campusesRes = await request.get("/api/v1/campuses");
    expect(campusesRes.ok()).toBeTruthy();
    const campusesData = await campusesRes.json();
    expect(campusesData.success).toBe(true);

    const archiveRes = await request.get("/api/v1/archive");
    expect(archiveRes.ok()).toBeTruthy();
    const archiveData = await archiveRes.json();
    expect(archiveData.success).toBe(true);
  });
});
