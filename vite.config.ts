import { defineConfig } from "vite";
import { SECURITY_HEADERS } from "./infra/csp";

export default defineConfig({
  server: { port: 5190, strictPort: true },
  // Same headers as production (ADR 0011), so the E2E catches CSP violations.
  preview: { port: 5191, strictPort: true, headers: { ...SECURITY_HEADERS } },
  build: {
    // Images always as hashed files in /assets/, never inlined as data: (cache, ADR 0011).
    assetsInlineLimit: 0,
    // Phaser alone is about 1.2 MB minified; the warning would fire on every build.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        // Phaser in its own chunk: unchanged between deploys without a version bump.
        manualChunks: (id) => (id.includes("node_modules/phaser/") ? "phaser" : undefined),
      },
    },
  },
});
