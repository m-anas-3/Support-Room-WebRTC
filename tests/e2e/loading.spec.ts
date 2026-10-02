import { expect, test } from "@playwright/test";

test("slow navigation retains the current page without sidebar spinners", async ({
  page,
}) => {
  let release!: () => void;
  let requestHeld = false;
  const heldResponse = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/settings?*", async (route) => {
    if (route.request().headers().rsc === "1") {
      requestHeld = true;
      await heldResponse;
    }
    await route.continue();
  });
  try {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Welcome back, Alex" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect.poll(() => requestHeld).toBe(true);
    await expect(
      page.locator('[data-slot="sidebar"] [role="status"]'),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Welcome back, Alex" }),
    ).toBeVisible();
    release();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(
      page.locator('[data-slot="sidebar"] [role="status"]'),
    ).toHaveCount(0);
  } finally {
    release();
  }
});
