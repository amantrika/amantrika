import { expect, type Page } from "@playwright/test";
import type { TestHost } from "./supabase";

/** Signs in through the real login form, so the auth path is under test too. */
export async function signIn(page: Page, host: TestHost) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(host.email);
  await page.getByLabel("Password").fill(host.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
