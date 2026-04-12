import { test } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";

test("does Bulwark make JMAP requests without password in memory?", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${TOKEN}` });

  // Pre-seed localStorage as if the user was previously logged in
  await page.goto("/en/login");
  await page.evaluate(() => {
    const serverUrl = "https://email.host.zackpolizzi.com";
    const accountId = "owner@email.host.zackpolizzi.com";
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          serverUrl,
          username: "owner",
          authMode: "basic",
          rememberMe: false,
          activeAccountId: accountId,
        },
        version: 0,
      })
    );
    localStorage.setItem(
      "account-registry",
      JSON.stringify({
        state: {
          accounts: [
            {
              label: "owner",
              serverUrl,
              username: "owner",
              authMode: "basic",
              rememberMe: false,
              displayName: "owner",
              email: "owner",
              lastLoginAt: Date.now(),
              isConnected: true,
              hasError: false,
              isDefault: true,
              id: accountId,
              cookieSlot: 0,
              avatarColor: "#3b82f6",
            },
          ],
          activeAccountId: accountId,
          defaultAccountId: accountId,
        },
        version: 0,
      })
    );
    localStorage.setItem("webmail_usernames", JSON.stringify(["owner"]));
  });

  // Track requests to the JMAP server
  const jmapRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("email.host.zackpolizzi.com")) {
      const auth = req.headers()["authorization"] || "NONE";
      jmapRequests.push(
        `${req.method()} ${req.url()} auth=${auth.substring(0, 30)}`
      );
    }
  });

  // Navigate to inbox
  await page.goto("/en");
  await page.waitForTimeout(5000);

  console.log("=== JMAP REQUESTS ===");
  for (const r of jmapRequests) console.log(r);
  console.log(`Total: ${jmapRequests.length}`);

  await page.screenshot({ path: "tests/preseed-result.png", fullPage: true });
});
