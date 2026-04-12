import { test, expect } from "@playwright/test";

const USER = "demo";
const PASS = "demo1234";

const emailInput = (page) => page.getByLabel("Email");
const passInput = (page) => page.getByPlaceholder("Enter your password");
const signIn = (page) => page.getByRole("button", { name: "Sign in" });

test.describe("Bulwark webmail + Stalwart JMAP", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(emailInput(page)).toBeVisible();
    await expect(passInput(page)).toBeVisible();
  });

  test("login with valid credentials", async ({ page }) => {
    await page.goto("/");
    await emailInput(page).fill(USER);
    await passInput(page).fill(PASS);
    await signIn(page).click();

    // Should navigate away from login page to the mailbox
    await expect(page.getByText("Sign in to your account")).not.toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: "tests/after-login.png", fullPage: true });
  });

  test("login with bad credentials is rejected", async ({ page }) => {
    await page.goto("/");
    await emailInput(page).fill(USER);
    await passInput(page).fill("wrongpassword");
    await signIn(page).click();

    // Should stay on login page and show an error
    await expect(emailInput(page)).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "tests/bad-login.png", fullPage: true });
  });

  test("inbox shows seeded email", async ({ page }) => {
    await page.goto("/");
    await emailInput(page).fill(USER);
    await passInput(page).fill(PASS);
    await signIn(page).click();

    await expect(page.getByText("Sign in to your account")).not.toBeVisible({
      timeout: 15_000,
    });

    // The seeded email should appear
    await expect(
      page.getByText("Welcome to your mailbox")
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "tests/inbox.png", fullPage: true });
  });
});
