import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/baticlair_test";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/support/global-setup.ts"],
    // Aucun test n'appelle l'API Anthropic réelle (Greg, 25 octobre 2026) : clés retirées, appels refusés.
    setupFiles: ["test/support/sans-ia-reelle.ts"],
    // Les tests d'intégration partagent une base : exécution séquentielle.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: "test-secret-test-secret-test-secret-000",
      EMAIL_PROVIDER: "capture",
      AI_PROVIDER: "fake",
      LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? "silent",
      // Les tests enchaînent des centaines de requêtes depuis une même adresse ; rate-limit.test.ts rétablit la vraie limite.
      RATE_LIMIT: "off",
      // Recentrage (25 octobre 2026) : les tests d'avant ouvrent les regroupements partout ; recentrage.test.ts règle le 22.
      ZONES_ACTIVES: "*",
      API_PUBLIC_URL: "http://localhost:4000",
      WEB_APP_URL: "http://localhost:3000",
      // Les tests métier créent librement des chantiers ; billing.test.ts vérifie les vraies limites.
      BILLING_PLANS: JSON.stringify([
        { key: "trial", label: "Essai gratuit", projectLimit: 1000, period: "trial", priceEurMonth: null, offered: false },
        { key: "solo", label: "Solo", projectLimit: 10, period: "month", priceEurMonth: 39, offered: true },
      ]),
    },
  },
});
