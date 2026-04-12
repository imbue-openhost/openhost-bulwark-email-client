import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("visiting / auto-logs in and shows inbox", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  await page.goto("/", { waitUntil: "commit" });

  await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible({
    timeout: 25_000,
  });
});
