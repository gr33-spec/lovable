import { describe, expect, it } from "vitest";
import {
  codeInvitationValide,
  CONSENTEMENT_LISTE_ATTENTE,
  estOuvert,
  messageInvitation,
  METIERS_AU_PLURIEL,
  PHRASE_DISPONIBILITE,
  PHRASE_INVITATION,
  phraseSurLaListe,
  texteAnnonce,
  TRADES,
} from "../src/index.js";

/** CHANTIER 05 (Greg, 28 novembre 2026) : les phrases et les règles de la liste d'attente et des invitations. */
describe("chantier 05", () => {
  it("la phrase de Greg, mot pour mot ; chaque métier a son pluriel", () => {
    expect(phraseSurLaListe("drywall", "22")).toBe("On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22.");
    expect(phraseSurLaListe("electrical", null)).toBe("On t'écrit dès que Mobiiz ouvre pour les électriciens de ton département.");
    for (const t of TRADES) expect(METIERS_AU_PLURIEL[t.id], t.id).toBeTruthy();
  });

  it("au lancement, seuls les couvreurs des Côtes-d'Armor sont ouverts ; une annonce ouvre son couple, rien d'autre", () => {
    expect(estOuvert("roofing", "22")).toBe(true);
    expect(estOuvert("roofing", "29")).toBe(false);
    expect(estOuvert("drywall", "22")).toBe(false);
    expect(estOuvert("roofing", null)).toBe(false);
    expect(estOuvert("drywall", "22", [{ metier: "drywall", departement: "22" }])).toBe(true);
    expect(estOuvert("drywall", "29", [{ metier: "drywall", departement: "22" }])).toBe(false);
  });

  it("aucune date, aucun montant, aucun mot interdit sur ce qui se lit hors de l'app", () => {
    const publics = [PHRASE_DISPONIBILITE, PHRASE_INVITATION, messageInvitation("https://test.mobiiz.fr/invitation/abcdefghij"), CONSENTEMENT_LISTE_ATTENTE.texte];
    for (const p of publics) {
      expect(p).not.toMatch(/\bIA\b|automatique|précis|exact|illimit|€|\d{4}/i);
    }
    expect(PHRASE_INVITATION).toBe("Tu connais d'autres artisans ? Invite-les à découvrir Mobiiz. Plus on est, moins on paie.");
  });

  it("l'e-mail d'ouverture : un lien d'action, le lien de désinscription en dernière ligne", () => {
    const t = texteAnnonce({ metier: "drywall", departement: { code: "22", nom: "Côtes-d'Armor" }, aUnCompte: false, lienAction: "https://x/commencer", lienDesinscription: "https://x/liste-attente/desinscription?jeton=j" });
    expect(t).toContain("les plaquistes du 22 (Côtes-d'Armor)");
    expect(t.trim().split("\n").at(-1)).toBe("Ne plus recevoir ces e-mails : https://x/liste-attente/desinscription?jeton=j");
  });

  it("un code d'invitation se lit sans erreur (ni 0, o, 1, l)", () => {
    expect(codeInvitationValide("abcdefghij")).toBe(true);
    expect(codeInvitationValide("abcdefgh0l")).toBe(false);
    expect(codeInvitationValide("ABCDEFGHIJ")).toBe(false);
    expect(codeInvitationValide("abc")).toBe(false);
  });
});
