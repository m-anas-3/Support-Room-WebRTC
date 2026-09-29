import { expect, test } from "@playwright/test";

test("serves browser media and security policies", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const headers = response.headers();
  const permissions = headers["permissions-policy"];

  expect(permissions).toContain("camera=(self)");
  expect(permissions).toContain("microphone=(self)");
  expect(permissions).toContain("display-capture=(self)");
  expect(permissions).toContain("speaker-selection=(self)");
  expect(permissions).toContain("screen-wake-lock=(self)");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["x-powered-by"]).toBeUndefined();
});
