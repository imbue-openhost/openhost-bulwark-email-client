import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test.describe("Owner auth flow", () => {
  test("email admin API works with owner Bearer token", async ({ request }) => {
    const resp = await request.get(
      "https://email.host.zackpolizzi.com/api/principal?page=0&limit=10",
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.data.items.length).toBeGreaterThan(0);
  });

  test("JMAP authenticates as owner via Bearer token", async ({ request }) => {
    const resp = await request.get(
      "https://email.host.zackpolizzi.com/jmap/session",
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.username).toContain("owner");
  });

  test("owner-login auto-fills and logs into webmail", async ({ page }) => {
    // Simulate OpenHost auth with Bearer token
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

    await page.goto("/owner-login");

    // Should eventually end up in the inbox (not login page)
    await page.waitForURL((url) => !url.pathname.includes("login"), {
      timeout: 30_000,
    });

    // Should see mailbox UI elements
    await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "tests/owner-inbox.png", fullPage: true });
  });
});
