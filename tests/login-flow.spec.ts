import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("direct /owner-login sets session and loads inbox", async ({ page }) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  const navs: string[] = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) navs.push(new URL(f.url()).pathname);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("ERR:", msg.text().substring(0, 200));
  });

  // Go directly to /owner-login
  await page.goto("/owner-login");

  // Wait for the redirect chain and inbox
  await page.waitForTimeout(5000);

  const cookies = await page.context().cookies();
  console.log("Cookies:", cookies.map((c) => c.name).join(", "));
  console.log("NAV:", navs.join(" -> "));
  console.log("Final URL:", page.url());

  await page.screenshot({ path: "tests/direct-owner.png", fullPage: true });

  // Check if we made it to inbox
  const hasInbox = await page.getByRole("button", { name: "Inbox" }).isVisible().catch(() => false);
  console.log("Has Inbox:", hasInbox);

  // If not inbox, check what page we're on
  if (!hasInbox) {
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log("Page text:", pageText);
  }
});
