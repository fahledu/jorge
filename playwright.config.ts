import { defineConfig, devices } from "@playwright/test";

// E2E against the production build served by `vite preview` with the CSP (ADR 0010).
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: "http://localhost:5191", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-landscape", use: { ...devices["Pixel 7 landscape"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm preview",
    url: "http://localhost:5191",
    // Always a fresh build: a leftover preview would test stale code (strictPort fails instead).
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
