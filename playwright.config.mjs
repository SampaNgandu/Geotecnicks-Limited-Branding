import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:8788",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: `"${process.execPath}" scripts/build.mjs && "${process.execPath}" scripts/serve.mjs`,
    url: "http://127.0.0.1:8788",
    reuseExistingServer: false,
  },
});
