import { describe, expect, it } from "vitest";
import { liensDesactives, objetExterne, pieceDangereuse, verdictEntrant, volumeAnormal } from "../src/index.js";

/**
 * LES E-MAILS ENTRANTS, BLINDÉS (Greg, 22 novembre 2026, après un spam d'arnaque renvoyé habillé du logo Mobiiz) :
 * l'authentification du serveur de réception décide (SPF, DKIM, DMARC), les pièces jointes dangereuses sont retenues,
 * une usurpation de mobiiz.fr est suspecte, et un message externe n'a jamais un lien cliquable.
 */
const ok = { spf: "pass", dkim: "pass", dmarc: "pass" };

describe("verdict d'un message reçu", () => {
  it("un vrai négoce authentifié, avec son devis PDF : passe", () => {
    const v = verdictEntrant({ de: "Point P <devis@pointp.fr>", authentification: ok, pieces: [{ nom: "Devis 2041.pdf", type: "application/pdf" }], domaineApp: "mobiiz.fr" });
    expect(v).toEqual({ suspect: false, raisons: [], piecesBloquees: [], authentifie: true });
  });

  it("DMARC refusé, ou SPF et DKIM refusés tous les deux : suspect", () => {
    expect(verdictEntrant({ de: "x@banque.fr", authentification: { ...ok, dmarc: "fail" }, pieces: [], domaineApp: "mobiiz.fr" }).suspect).toBe(true);
    expect(verdictEntrant({ de: "x@negoce.fr", authentification: { spf: "fail", dkim: "fail", dmarc: "gray" }, pieces: [], domaineApp: "mobiiz.fr" }).raisons).toContain("Expéditeur non authentifié (SPF et DKIM refusés)");
    // Un seul des deux qui échoue, sans politique DMARC : pas suspect, mais pas authentifié non plus.
    expect(verdictEntrant({ de: "x@negoce.fr", authentification: { spf: "fail", dkim: "gray", dmarc: "gray" }, pieces: [], domaineApp: "mobiiz.fr" })).toMatchObject({ suspect: false, authentifie: false });
  });

  it("usurpation de mobiiz.fr (ou d'un sous-domaine) sans DMARC passé : suspect", () => {
    const v = verdictEntrant({ de: "Mobiiz <contact@mobiiz.fr>", authentification: { spf: "gray", dkim: "gray", dmarc: "gray" }, pieces: [], domaineApp: "mobiiz.fr" });
    expect(v.raisons).toContain("Se fait passer pour mobiiz.fr sans le prouver");
    expect(verdictEntrant({ de: "support@reponses.mobiiz.fr", authentification: null, pieces: [], domaineApp: "mobiiz.fr" }).suspect).toBe(true);
    // « mobiiz.fr.arnaque.com » imite mobiiz.fr (saboteur, 22 novembre 2026) : suspect, même authentifié.
    expect(verdictEntrant({ de: "a@mobiiz.fr.arnaque.com", authentification: ok, pieces: [], domaineApp: "mobiiz.fr" }).raisons).toContain("Domaine qui imite mobiiz.fr : mobiiz.fr.arnaque.com");
  });

  it("sans résultat d'authentification : pas suspect, jamais authentifié", () => {
    expect(verdictEntrant({ de: "a@negoce.fr", authentification: null, pieces: [], domaineApp: "mobiiz.fr" })).toMatchObject({ suspect: false, authentifie: false });
  });

  it("pièces jointes : exécutables, archives, macros et pages web retenues ; PDF, images et Excel sans macro passent", () => {
    for (const nom of ["facture.exe", "Devis.pdf.exe", "photos.zip", "devis.rar", "tarif.xlsm", "commande.docm", "lien.html", "page.svg", "script.js", "raccourci.lnk", "disque.iso", "DEVIS.PDF.SCR", "devis.pdf "]) {
      const dangereux = nom !== "devis.pdf ";
      expect(pieceDangereuse(nom), nom).toBe(dangereux);
    }
    for (const nom of ["devis.pdf", "photo.jpg", "plan.PNG", "chantier.heic", "tarif.xlsx", "liste.docx", "liste.csv"]) expect(pieceDangereuse(nom), nom).toBe(false);
    expect(pieceDangereuse("devis.pdf", "application/x-msdownload")).toBe(true);
    const v = verdictEntrant({ de: "a@negoce.fr", authentification: ok, pieces: [{ nom: "devis.pdf" }, { nom: "devis.pdf.exe" }], domaineApp: "mobiiz.fr" });
    expect(v).toMatchObject({ suspect: true, piecesBloquees: ["devis.pdf.exe"] });
  });
});

describe("un message externe n'est jamais habillé en Mobiiz", () => {
  it("les liens deviennent du texte non cliquable", () => {
    expect(liensDesactives("Cliquez ici : https://mobiiz-paiement.com/login?x=1 ou www.arnaque.fr.")).toBe("Cliquez ici : hxxps[:]//mobiiz-paiement[.]com/login?x=1 ou www[.]arnaque[.]fr.");
    expect(liensDesactives("http://site.fr")).toBe("hxxp[:]//site[.]fr");
    expect(liensDesactives("Bonjour, voici le devis.")).toBe("Bonjour, voici le devis.");
  });

  it("un texte énorme (3 Mo, sans point) est traité vite : jamais de calcul sans fin", () => {
    const debut = Date.now();
    liensDesactives("A".repeat(3 * 1024 * 1024));
    liensDesactives("a-".repeat(500_000) + "b.example");
    expect(Date.now() - debut).toBeLessThan(2000);
  });

  it("l'objet est préfixé [Externe] une seule fois", () => {
    expect(objetExterne("Votre colis")).toBe("[Externe] Votre colis");
    expect(objetExterne("[Externe] Votre colis")).toBe("[Externe] Votre colis");
    expect(objetExterne("")).toBe("[Externe] (sans objet)");
  });

  it("volume anormal : 30 messages dans l'heure sur la même adresse", () => {
    expect(volumeAnormal(29)).toBe(false);
    expect(volumeAnormal(30)).toBe(true);
  });
});
