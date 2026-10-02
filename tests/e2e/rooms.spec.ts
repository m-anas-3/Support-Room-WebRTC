import { expect, test, type Page } from "@playwright/test";

async function createRoom(page: Page, reference: string) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New room" }).click();
  await page.getByLabel("Reference").fill(reference);
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  const invitation = page.getByRole("textbox", { name: "Invitation link" });
  await expect(invitation).toHaveValue(/\/join\/.+#token=/);
  const roomId = new URL(await invitation.inputValue()).pathname
    .split("/")
    .at(-1)!;
  await page.keyboard.press("Escape");
  return roomId;
}

test("an unopened room survives navigation and refresh and opens from the full row", async ({
  page,
}, testInfo) => {
  const roomId = await createRoom(page, "Return to unopened room");
  await expect(
    page.getByRole("link", { name: "Open room Return to unopened room" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Device check", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Look good. Sound clear." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Open room Return to unopened room" }),
  ).toBeVisible();

  // The history screen also offers the room even if recording history failed.
  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Session history" }),
  ).toBeVisible();
  const row = page.getByRole("link", {
    name: "Open room Return to unopened room",
  });
  await expect(row).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("open-rooms-desktop.png"),
    fullPage: true,
  });
  await row.getByText(/Expires/).click();
  await expect(page).toHaveURL(new RegExp(`/room/${roomId}$`));
  await expect(
    page.getByText("Return to unopened room", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Waiting room", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "End room", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "End room", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("link", { name: "Open room Return to unopened room" }),
  ).toHaveCount(0);
});

test("expired and other-agent rooms are hidden and mobile rows remain usable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const roomId = await createRoom(page, "Mobile room");
  const row = page.getByRole("link", { name: "Open room Mobile room" });
  await expect(row).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("open-rooms-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate((id) => {
    const key = `supportroom:host:${id}`;
    const room = JSON.parse(sessionStorage.getItem(key)!);
    sessionStorage.setItem(
      "supportroom:host:other",
      JSON.stringify({
        ...room,
        agentId: "other-agent",
        reference: "Another agent room",
      }),
    );
    sessionStorage.setItem("supportroom:host:invalid", "invalid-json");
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...room, expiresAt: Date.now() + 1000 }),
    );
    window.dispatchEvent(new Event("supportroom:host-rooms-changed"));
  }, roomId);
  await expect(
    page.getByRole("link", { name: "Open room Another agent room" }),
  ).toHaveCount(0);
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(row).toHaveCount(0);
});
