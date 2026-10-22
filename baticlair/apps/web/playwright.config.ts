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
  // Les e-mails sont capturés et lus par les parcours (boîte aux lettres de test, `GET /v1/internal/test/emails`, secret CRON_SECRET).
  EMAIL_PROVIDER: process.env.E2E_EMAIL_PROVIDER ?? "capture",
  CRON_SECRET: "e2e-secret-de-la-tache",
  // BatiClair Groupé, étape 8 : le webhook Resend entrant et l'adresse de réponse des lots, la facture de commission.
  RESEND_WEBHOOK_SECRET: "whsec_ZTJlLXNlY3JldC1kdS13ZWJob29rLTAwMDA=",
  REPONSES_DOMAINE: "reponses.example.com",
  FACTURE_EMETTEUR_NOM: "Société Émettrice",
  FACTURE_EMETTEUR_FORME: "SARL",
  FACTURE_EMETTEUR_SIRET: "000 000 000 00000",
  FACTURE_EMETTEUR_ADRESSE: "1 rue de l'Exemple, 22000 Ville",
  FACTURE_EMETTEUR_TVA: "FR00000000000",
  AI_PROVIDER: "fake",
  PLAN_ACTIVATION_CODES: "E2E-SOLO-CODE:solo",
  // Le paywall est en pause en production (fondateur, 2026-10-11) ; les parcours gardent son écran prêt pour plus tard.
  PAYWALL: "on",
  // Les parcours vérifient la limite de l'essai (3 chantiers), comme à l'ouverture ; en bêta, l'essai est sans limite.
  BILLING_PLANS: JSON.stringify([
    { key: "trial", label: "Essai gratuit", projectLimit: 3, period: "trial", priceEurMonth: null, offered: false },
    { key: "solo", label: "Solo", projectLimit: 10, period: "month", priceEurMonth: 39, offered: true },
    { key: "pro", label: "Pro", projectLimit: 30, period: "month", priceEurMonth: 79, offered: true },
  ]),
  LOG_LEVEL: "warn",
  // 26 parcours créent chacun un compte et une entreprise depuis la même adresse : la limite de débit (5 entreprises/h) les bloquerait ; elle a son propre test API.
  RATE_LIMIT: "off",
  // BatiClair Groupé : allumé pour ses parcours ; une entreprise sans SIRET vérifié n'en voit rien (gratuit pour l'artisan).
  GROUPE: "on",
  // La commande commune du mois (par défaut) ; « lots » pour la passe de l'ancien regroupement (`--grep @lots`).
  COMMANDE_COMMUNE: process.env.E2E_COMMANDE_COMMUNE ?? "mois",
  // Étape 9 : l'admin du groupé (journal, lots, factures) pour ce seul compte des parcours.
  GROUPE_ADMINS: "admin-groupe@example.fr",
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
      // Dette n° 2 (21 octobre) : chaque série repart d'une base vide, sinon les lots des séries précédentes (même
      // département, même référence) faussent les parcours groupé.
      command: "pnpm --filter @baticlair/api exec prisma migrate deploy && pnpm --filter @baticlair/api exec node scripts/vider-base-e2e.mjs && pnpm --filter @baticlair/api exec tsx src/main.ts",
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
