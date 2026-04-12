import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("email admin auto-login via /owner-login", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  await page.goto("https://email.host.zackpolizzi.com/owner-login");

  // Should end up on the admin dashboard (not the login page)
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: "tests/stalwart-autologin.png", fullPage: true });
});

test("visiting email / redirects to admin dashboard", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  await page.goto("https://email.host.zackpolizzi.com/");

  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible({ timeout: 20_000 });
});
