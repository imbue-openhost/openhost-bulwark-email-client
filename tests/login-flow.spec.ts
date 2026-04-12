import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("/owner-login creates session and shows inbox", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  await page.goto("/owner-login");

  await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible({
    timeout: 20_000,
  });
});
