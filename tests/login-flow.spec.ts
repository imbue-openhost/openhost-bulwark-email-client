import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("/owner-login creates session and shows inbox", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  await page.goto("/owner-login");

  // Inbox UI loads — check for the welcome banner or Folders heading
  await expect(page.getByText("Folders")).toBeVisible({ timeout: 20_000 });
});

test("visiting / auto-redirects to inbox when no cookie", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  await page.goto("/");

  await expect(page.getByText("Folders")).toBeVisible({ timeout: 25_000 });
});
