import { defineConfig, devices } from "@playwright/test";

// E2E against the `e2e` build (production plus the test shortcut, ADR 0010), served by
// `vite preview` with the production CSP.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  // Each worker runs Phaser at 60 fps; with more than 2 the timing and jump checks fail
  // under load (3 workers still failed once, 2 passed three runs in a row).
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: "http://localhost:5191", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-landscape", use: { ...devices["Pixel 7 landscape"] } },
  ],
  webServer: {
    command: "pnpm typecheck && pnpm build:e2e && pnpm preview:e2e",
    url: "http://localhost:5191",
    // Always a fresh build: a leftover preview would test stale code (strictPort fails instead).
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
