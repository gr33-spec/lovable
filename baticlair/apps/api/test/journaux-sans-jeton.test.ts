import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cheminJournalise } from "../src/platform/http/request-context.middleware.js";

/**
 * LES JOURNAUX NE GARDENT AUCUN JETON (audit du 27 novembre 2026, accord de Greg) : avant, le chemin complet était écrit,
 * et un lien de négoce (`/v1/negoce/connexion/<jeton>`, `/v1/public/chiffrer/<jeton>`…) pouvait être rejoué par quiconque
 * lisait les journaux Vercel.
 */
describe("chemin écrit dans les journaux", () => {
  it("masque les jetons, garde les identifiants et les mots des routes", () => {
    for (let i = 0; i < 200; i++) {
      const jeton = randomBytes(24).toString("base64url");
      for (const p of [`/v1/negoce/connexion/${jeton}`, `/v1/public/chiffrer/${jeton}`, `/v1/reponse/${jeton}/contrat.pdf`, `/v1/public/achat-groupe/${jeton}/demande.xlsx`, `/v1/emails/stop/${jeton}`]) {
        const ecrit = cheminJournalise(p);
        expect(ecrit).not.toContain(jeton);
        expect(ecrit).toContain("***");
      }
    }
    const hex = randomBytes(24).toString("hex");
    expect(cheminJournalise(`/v1/fichiers-pro/ouvrir/${hex}`)).toBe("/v1/fichiers-pro/ouvrir/***");
    expect(cheminJournalise("/v1/projects/0190f5e2-1b2c-7d3e-8f4a-5b6c7d8e9f01/demande-de-devis.pdf?x=secret")).toBe("/v1/projects/0190f5e2-1b2c-7d3e-8f4a-5b6c7d8e9f01/demande-de-devis.pdf");
    expect(cheminJournalise("/v1/achats-groupes-v1/alertes-achats-groupes")).toBe("/v1/achats-groupes-v1/alertes-achats-groupes");
    expect(cheminJournalise("/v1/price-request-recipients/0190f5e2-1b2c-7d3e-8f4a-5b6c7d8e9f01/send")).toBe("/v1/price-request-recipients/0190f5e2-1b2c-7d3e-8f4a-5b6c7d8e9f01/send");
  });
});
