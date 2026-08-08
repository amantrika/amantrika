import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { createTestHost, type TestHost } from "./helpers/supabase";

let host: TestHost;

test.beforeAll(async () => {
  host = await createTestHost();
});

test.describe("signing in", () => {
  test("valid credentials reach a signed-in surface", async ({ page }) => {
    await signIn(page, host);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("a wrong password does not reveal whether the address is registered", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(host.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    const message = page.getByText(/didn't work/i);
    await expect(message).toBeVisible();

    // Anything naming the account would let an attacker enumerate addresses.
    await expect(message).not.toContainText(/no account|not registered|does not exist/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unregistered address gets the same message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("e2e-nobody@amantrika-e2e.test");
    await page.getByLabel("Password").fill("whatever-here");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText(/didn't work/i)).toBeVisible();
  });
});

test.describe("private surfaces", () => {
  for (const path of ["/dashboard", "/onboarding", "/admin"]) {
    test(`${path} sends a signed-out visitor to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("a host cannot reach the admin area", async ({ page }) => {
    await signIn(page, host);
    await page.goto("/admin");

    // §: a signed-in host hitting /admin lands somewhere useful, not a 403.
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
