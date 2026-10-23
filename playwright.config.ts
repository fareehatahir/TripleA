import { defineConfig } from "@playwright/test";

const PORT = 3200;
export const TEST_ENV = {
  // Set E2E_DATABASE_URL=postgresql://… to run the whole suite against PostgreSQL (build with the same DATABASE_URL first).
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "file:./test.db",
  UPLOAD_DIR: "./storage/test-uploads",
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-12",
  AUTH_TRUST_HOST: "true",
  ADMIN_EMAIL: "e2e-admin@tripleaint.tw",
  ADMIN_PASSWORD: "E2e-Password-123",
  ADMIN_NAME: "E2E Admin",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
};

// Run `npm run build` first (the `test:e2e` script does). Uses a separate SQLite DB + upload folder.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`, // needs no database, which does not exist yet on a fresh checkout
    env: TEST_ENV,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
