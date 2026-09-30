import { expect, test } from "@playwright/test";

test("shows real account security controls without placeholder account claims", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Security" }).click();

  await expect(page.getByLabel("New password")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  await expect(page.getByLabel("Verification code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send verification code" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out other devices" })).toBeVisible();
  await expect(page.getByText("Last changed 42 days ago")).toHaveCount(0);
  await expect(page.getByText("You are signed in on 2 devices.")).toHaveCount(0);
});
