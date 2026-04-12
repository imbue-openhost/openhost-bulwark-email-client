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

  test("/owner-login creates session and redirects to inbox", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });
    await page.goto("/owner-login");

    // Should end up in the inbox
    await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible({
      timeout: 20_000,
    });
  });
});
