import { defineConfig, devices } from "@playwright/test";

// These tests exercise the real API + real Supabase DB (and, in
// full-flow.spec.ts, real Stripe test-mode Checkout) — no mocking, matching
// how every feature in this app has been verified throughout development.
// Each spec file is responsible for tagging and cleaning up its own test
// data (see tests/helpers.ts).
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // spec files share the same live DB; avoid cross-test interference
  workers: 1, // cleanupTestCompanies() in one spec's beforeAll/afterAll would otherwise race and delete another spec's in-progress data
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
