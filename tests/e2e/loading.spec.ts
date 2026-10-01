import { expect, test } from "@playwright/test";

test("slow navigation shows feedback and retains the current page", async ({
  page,
}) => {
  let release!: () => void;
  const heldResponse = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/settings?*", async (route) => {
    if (route.request().headers().rsc === "1") await heldResponse;
    await route.continue();
  });
  try {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Welcome back, Alex" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading page…" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome back, Alex" }),
    ).toBeVisible();
    release();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading page…" }),
    ).toHaveCount(0);
  } finally {
    release();
  }
});
