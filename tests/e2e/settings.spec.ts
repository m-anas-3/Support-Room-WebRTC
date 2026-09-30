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

test("shows persisted browser notification controls without email placeholders", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Notifications" }).click();

  await expect(page.getByRole("switch", { name: "Customer enters waiting room" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Connection quality drops" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Save notifications" })).toBeVisible();
  await expect(page.getByText("Session summary ready")).toHaveCount(0);
  await expect(page.getByText("Weekly activity summary")).toHaveCount(0);
});

test("provides password recovery and reset screens", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Recover your account" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await expect(page.getByLabel("New password")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
});
