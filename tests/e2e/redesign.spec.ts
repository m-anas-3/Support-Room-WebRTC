import { expect, test } from "@playwright/test";

test("workspace, account, and guest pages stay within the viewport", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const routes = [
    "/dashboard",
    "/playground",
    "/sessions",
    "/settings",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/join/preview",
    "/not-a-page",
  ];
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          { message: `${route} at ${width}px must not overflow` },
        )
        .toBe(true);
      if (width === 390 || width === 1280)
        await page.screenshot({
          path: testInfo.outputPath(
            `${route.replaceAll("/", "-")}-${width}.png`,
          ),
          fullPage: true,
        });
    }
  }
});

test("invitation stays selectable and contained on a small screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New room" }).click();
  await page
    .getByLabel("Reference")
    .fill("A long customer reference ".repeat(4));
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const input = page.getByRole("textbox", { name: "Invitation link" });
  await expect(input).toHaveValue(/\/join\/.+#token=/);
  await expect(
    page.getByRole("button", { name: "Copy invitation link" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Open room" }),
  ).toBeInViewport();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await input.focus();
  expect(
    await input.evaluate((element) => {
      const field = element as HTMLInputElement;
      return (
        field.selectionStart === 0 && field.selectionEnd === field.value.length
      );
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "New room" })).toBeFocused();
});

test("sidebar and settings remain keyboard accessible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Welcome back, Alex" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle Sidebar", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeFocused();
});
