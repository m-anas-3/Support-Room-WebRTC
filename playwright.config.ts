import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3100",
    permissions: ["camera", "microphone"],
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: [
    {
      command: "pnpm dev:signaling",
      url: "http://127.0.0.1:8081/health",
      reuseExistingServer: false,
      env: { PORT: "8081", ALLOWED_ORIGINS: "http://127.0.0.1:3100" },
    },
    {
      command: "pnpm --filter @support-room/shared build && pnpm exec next build --webpack && pnpm exec next start --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      env: { SUPPORTROOM_E2E: "1", NEXT_PUBLIC_SIGNALING_URL: "ws://127.0.0.1:8081/signal", NEXT_PUBLIC_STUN_URLS: "" },
      timeout: 120_000,
    },
  ],
});
