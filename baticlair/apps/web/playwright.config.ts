import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours de bout en bout, dans un vrai navigateur, contre la vraie API
 * et une vraie base PostgreSQL. Démarre l'API (port 4000) et le site
 * (port 3000) sauf s'ils tournent déjà.
 */
const apiEnv = {
  NODE_ENV: "test",
  PORT: "4000",
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://postgres@localhost:5432/baticlair_e2e",
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0000",
  API_PUBLIC_URL: "http://localhost:3000",
  WEB_APP_URL: "http://localhost:3000",
  EMAIL_PROVIDER: "console",
  AI_PROVIDER: "fake",
  PLAN_ACTIVATION_CODES: "E2E-SOLO-CODE:solo",
  // Les parcours vérifient la limite de l'essai (3 chantiers), comme à l'ouverture ; en bêta, l'essai est sans limite.
  BILLING_PLANS: JSON.stringify([
    { key: "trial", label: "Essai gratuit", projectLimit: 3, period: "trial", priceEurMonth: null, offered: false },
    { key: "solo", label: "Solo", projectLimit: 10, period: "month", priceEurMonth: 39, offered: true },
    { key: "pro", label: "Pro", projectLimit: 30, period: "month", priceEurMonth: 79, offered: true },
  ]),
  LOG_LEVEL: "warn",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "telephone", use: { ...devices["Pixel 7"] } },
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      command: "pnpm --filter @baticlair/api exec prisma migrate deploy && pnpm --filter @baticlair/api exec tsx src/main.ts",
      url: "http://localhost:4000/v1/health",
      env: apiEnv,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm start",
      url: "http://localhost:3000/connexion",
      env: { API_URL: "http://localhost:4000" },
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
