import { expect, test } from "@playwright/test";

test("sidebar account menu opens and links to settings without crashing", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Welcome back, Alex" }),
    ).toBeVisible();
    if (width === 390) {
      await page
        .getByRole("button", { name: "Toggle Sidebar", exact: true })
        .first()
        .click();
    }

    const trigger = page.getByRole("button", { name: "Account menu" });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Sign out", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("menuitem", { name: "Account settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCount(0);
  }

  expect(pageErrors).toEqual([]);
});

test("settings contains profile, call privacy, and password essentials", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Start with camera on" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "Start with microphone on" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Calls always start with your camera and microphone off.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("New password")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update password" }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByLabel("Role", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Verification code")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send verification code" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sign out other devices" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save notifications" }),
  ).toHaveCount(0);
  await expect(page.getByText("Preferred video quality")).toHaveCount(0);
});

test("provides password recovery and reset screens", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Recover your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();

  await page.goto("/reset-password");
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();
  await expect(page.getByLabel("New password")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
});
