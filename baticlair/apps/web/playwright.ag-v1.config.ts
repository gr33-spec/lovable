import { defineConfig, devices } from "@playwright/test";
import base, { apiEnv } from "./playwright.config";

/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026, V5.2 validée) : les parcours du nouveau circuit, réglage ACHATS_GROUPES_V1
 * allumé (coupé partout ailleurs : les autres parcours ne voient aucun changement). iPhone SE, Android, ordinateur.
 * MISSIONS_V1 allumé aussi (Greg, 10 novembre 2026) : c'est la configuration de test.mobiiz.fr, quatre onglets.
 */
const webServer = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testDir: "./e2e-ag-v1",
  projects: [
    { name: "iphone-se", use: { ...devices["iPhone SE"], browserName: "chromium" } },
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: webServer.map((w, i) => (i === 0 ? { ...w, env: { ...apiEnv, ACHATS_GROUPES_V1: "on", MISSIONS_V1: "on" } } : w)),
});
