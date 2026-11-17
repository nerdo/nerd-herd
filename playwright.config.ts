import { defineConfig } from "@playwright/test";

// The end-to-end tests drive a Herdr window, not a browser: no browser project is configured.
// One test window exists at a time, so tests run one after another.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 240_000,
  reporter: "list",
  globalSetup: "./e2e/support/global-setup.ts",
  globalTeardown: "./e2e/support/global-setup.ts",
});
