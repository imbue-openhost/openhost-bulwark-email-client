import { test, expect } from "@playwright/test";

const TOKEN = "xF3AcicsEB3HMWlilmF5YQZJ9R5fb_iKAvQIcnipHXY";
const USER = "owner";
const PASS = "openhost-owner-email";

const emailInput = (page) => page.getByLabel("Email");
const passInput = (page) => page.getByPlaceholder("Enter your password");
const signIn = (page) => page.getByRole("button", { name: "Sign in" });

test.use({
  extraHTTPHeaders: { Authorization: `Bearer ${TOKEN}` },
});

test.describe("Bulwark webmail + Stalwart JMAP", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(emailInput(page)).toBeVisible();
    await expect(passInput(page)).toBeVisible();
  });

  test("login with valid credentials", async ({ page }) => {
    await page.goto("/en/login");
    await emailInput(page).fill(USER);
    await passInput(page).fill(PASS);
    await signIn(page).click();

    await expect(page.getByText("Sign in to your account")).not.toBeVisible({
      timeout: 15_000,
    });
  });

  test("login with bad credentials is rejected", async ({ page }) => {
    await page.goto("/en/login");
    await emailInput(page).fill(USER);
    await passInput(page).fill("wrongpassword");
    await signIn(page).click();

    await expect(emailInput(page)).toBeVisible({ timeout: 10_000 });
  });

  test("inbox loads after login", async ({ page }) => {
    await page.goto("/en/login");
    await emailInput(page).fill(USER);
    await passInput(page).fill(PASS);
    await signIn(page).click();

    await expect(page.getByText("Sign in to your account")).not.toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Folders")).toBeVisible({ timeout: 15_000 });
  });
});
