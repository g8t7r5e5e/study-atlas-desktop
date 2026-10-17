const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  workers: 1,
  fullyParallel: false,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4184",
    viewport: { width: 1440, height: 900 },
    timezoneId: "Asia/Karachi",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "node tests/server.cjs",
    url: "http://127.0.0.1:4184",
    reuseExistingServer: false,
  },
});
