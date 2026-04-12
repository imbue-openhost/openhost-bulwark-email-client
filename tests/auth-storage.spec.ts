import { test } from "@playwright/test";

test("capture auth state after login", async ({ page }) => {
  // Capture localStorage before login
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const beforeLS = await page.evaluate(() => JSON.stringify(localStorage));
  const beforeCookies = await page.context().cookies();
  console.log("=== BEFORE LOGIN ===");
  console.log("localStorage:", beforeLS);
  console.log("cookies:", JSON.stringify(beforeCookies.map(c => c.name)));

  // Login
  await page.getByLabel("Email").fill("demo");
  await page.getByPlaceholder("Enter your password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for inbox to load
  await page.getByText("Sign in to your account").waitFor({ state: "hidden", timeout: 15_000 });
  await page.getByRole("heading", { name: "Welcome to your mailbox" }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(2000);

  // Capture localStorage after login
  const afterLS = await page.evaluate(() => JSON.stringify(localStorage));
  const afterCookies = await page.context().cookies();
  console.log("\n=== AFTER LOGIN ===");
  console.log("localStorage:", afterLS);
  console.log("cookies:", JSON.stringify(afterCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) }))));

  // Check indexedDB databases
  const idbDatabases = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const result: Record<string, string[]> = {};
    for (const db of dbs) {
      if (db.name) {
        const conn = indexedDB.open(db.name);
        const opened = await new Promise<IDBDatabase>((resolve) => {
          conn.onsuccess = () => resolve(conn.result);
        });
        result[db.name] = Array.from(opened.objectStoreNames);
        opened.close();
      }
    }
    return result;
  });
  console.log("\n=== INDEXEDDB ===");
  console.log(JSON.stringify(idbDatabases, null, 2));

  // Check sessionStorage
  const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
  console.log("\n=== SESSION STORAGE ===");
  console.log(sessionStorage);
});
