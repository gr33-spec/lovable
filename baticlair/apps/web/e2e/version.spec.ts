import { expect, test } from "@playwright/test";

/**
 * `/version` (Greg, 22 novembre 2026) : le site et l'API disent leur commit en ligne, et rien d'autre. En local, pas
 * d'hébergeur : pas de commit. Sur test.mobiiz.fr : le commit poussé, à attendre avant de dire « c'est en ligne ».
 */
test("/version du site et de l'API : le commit et l'environnement, aucune autre donnée", async ({ request }) => {
  for (const adresse of ["/version", "/v1/version"]) {
    const r = await request.get(adresse);
    expect(r.status()).toBe(200);
    const corps = (await r.json()) as Record<string, unknown>;
    expect(Object.keys(corps).sort()).toEqual(["commit", "environnement"]);
    expect(corps).toEqual({ commit: null, environnement: "local" });
  }
});
