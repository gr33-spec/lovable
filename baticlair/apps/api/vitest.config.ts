import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/baticlair_test";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/support/global-setup.ts"],
    // Les tests d'intégration partagent une base : exécution séquentielle.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: "test-secret-test-secret-test-secret-000",
      EMAIL_PROVIDER: "capture",
      AI_PROVIDER: "fake",
      LOG_LEVEL: "silent",
      API_PUBLIC_URL: "http://localhost:4000",
      WEB_APP_URL: "http://localhost:3000",
    },
  },
});
