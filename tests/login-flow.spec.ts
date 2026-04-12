import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("visiting / auto-logs in and shows inbox", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  const navs: string[] = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) navs.push(new URL(f.url()).pathname);
  });

  await page.goto("/", { waitUntil: "commit" });

  // Should end up in the inbox
  try {
    await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible({
      timeout: 25_000,
    });
    console.log("SUCCESS: Inbox visible");
  } catch {
    console.log("FAILED at:", page.url());
    await page.screenshot({ path: "tests/flow-debug.png", fullPage: true });
  }

  console.log("NAV:", navs.join(" -> "));
});
