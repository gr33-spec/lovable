import { describe, expect, it } from "vitest";
import { compteurAdmin, compteurDeReponses, consultationPourLeNegoce, datesDuCycle, messageNouvellesReponses, phraseDeMonNegoce, phraseDeReport, phraseResultatsLe, suiviDesDemandes } from "../src/index.js";

/**
 * LE SUIVI DES DEMANDES DE PRIX (Greg, 24 octobre 2026) : 0, 1, plusieurs et toutes les réponses ; la veille sans
 * réponse ; personne consulté ; le report à la commande suivante. Jamais un nom ni un prix avant les résultats.
 */
const d = datesDuCycle("2026-10-15");
const base = { mois: "2026-10-15", reponseAvant: d.reponseAvant, relanceLe: d.relanceLe, maintenant: new Date("2026-10-16T09:00:00Z") } as const;
const nbsp = (s: string | null) => (s ?? "").replace(/[  ]/g, " ");

describe("pendant le délai des négoces", () => {
  it("« Demandes envoyées à 10 négoces de ton secteur », « Résultats le 22/10 à 18 h », le compteur et la barre", () => {
    const s = suiviDesDemandes({ ...base, phase: "negoces", consultes: 10, repondus: 4 })!;
    expect(s.titre).toBe("Demandes envoyées à 10 négoces de ton secteur");
    expect(nbsp(s.resultatsLe)).toBe("Résultats le 22/10 à 18 h");
    expect(s.compteur).toBe("4 négoces sur 10 ont répondu");
    expect(s.progression).toBeCloseTo(0.4);
    expect(s.phrase).toBeNull();
  });

  it("0, 1, plusieurs, toutes : le compteur au singulier et au pluriel", () => {
    expect(compteurDeReponses(0, 10)).toBe("Aucun négoce sur 10 n'a encore répondu");
    expect(compteurDeReponses(1, 10)).toBe("1 négoce sur 10 a répondu");
    expect(compteurDeReponses(5, 10)).toBe("5 négoces sur 10 ont répondu");
    expect(compteurDeReponses(10, 10)).toBe("Les 10 négoces ont répondu");
    expect(compteurDeReponses(1, 1)).toBe("Le négoce consulté a répondu");
  });

  it("la veille, aucune réponse : « On les a relancés »", () => {
    const s = suiviDesDemandes({ ...base, maintenant: new Date(d.relanceLe.getTime() + 60_000), phase: "negoces", consultes: 10, repondus: 0 })!;
    expect(s.phrase).toBe("Aucune réponse pour l'instant. On les a relancés.");
    expect(suiviDesDemandes({ ...base, maintenant: new Date(d.relanceLe.getTime() + 60_000), phase: "negoces", consultes: 10, repondus: 1 })!.phrase).toBeNull();
  });

  it("aucun négoce consulté : le bouton « Mets ton négoce dans la boucle »", () => {
    const s = suiviDesDemandes({ ...base, phase: "negoces", consultes: 0, repondus: 0 })!;
    expect(s).toMatchObject({ compteur: null, progression: null, boucle: true });
  });

  it("rien pendant les inscriptions", () => {
    expect(suiviDesDemandes({ ...base, phase: "inscriptions", consultes: 0, repondus: 0 })).toBeNull();
  });
});

describe("à l'échéance", () => {
  it("plusieurs réponses : le meilleur prix livré", () => {
    expect(suiviDesDemandes({ ...base, phase: "resultats", consultes: 10, repondus: 5 })!.phrase).toBe("Sur 10 demandes, 5 négoces ont répondu. Voici le meilleur prix livré pour toi.");
    expect(suiviDesDemandes({ ...base, phase: "resultats", consultes: 10, repondus: 10 })!.phrase).toBe("Sur 10 demandes, 10 négoces ont répondu. Voici le meilleur prix livré pour toi.");
  });
  it("une seule réponse : « compare-le à ta dernière facture »", () => {
    expect(suiviDesDemandes({ ...base, phase: "resultats", consultes: 10, repondus: 1 })!.phrase).toBe("Sur 10 demandes, 1 négoce a répondu. Compare son prix à ta dernière facture.");
  });
  it("aucune réponse : la liste passe à la commande suivante", () => {
    expect(suiviDesDemandes({ ...base, phase: "resultats", consultes: 10, repondus: 0 })!.boucle).toBe(true);
    expect(phraseDeReport("2026-11-01", "2026-11-15")).toBe("Aucun négoce n'a répondu à la commande du 1er novembre. Ta liste passe automatiquement à la commande du 15 novembre.");
  });
});

describe("les notifications et les autres vues", () => {
  it("une notification par jour au plus, sans nom ni prix", () => {
    expect(nbsp(messageNouvellesReponses(2, d.reponseAvant).corps)).toBe("2 nouvelles réponses. Résultats le 22/10 à 18 h.");
    expect(messageNouvellesReponses(1, null).corps).toBe("1 nouvelle réponse.");
  });
  it("le négoce mis dans la boucle par l'artisan : répondu ou pas, jamais son prix", () => {
    expect(phraseDeMonNegoce("Comptoir Breton", "repondu")).toBe("Ton négoce Comptoir Breton a répondu.");
    expect(phraseDeMonNegoce("Comptoir Breton", "attente")).toBe("Ton négoce Comptoir Breton n'a pas encore répondu.");
    expect(phraseDeMonNegoce("Comptoir Breton", "pas_consulte")).toMatch(/n'a pas reçu cette demande/);
  });
  it("le négoce sait combien sont consultés, jamais lesquels", () => {
    expect(nbsp(consultationPourLeNegoce(10, d.reponseAvant))).toBe("10 négoces consultés, résultats le 22/10 à 18 h.");
    expect(nbsp(phraseResultatsLe(d.reponseAvant))).toBe("Résultats le 22/10 à 18 h");
  });
  it("l'admin : le même compteur par commande et par département", () => {
    expect(compteurAdmin({ zone: "22", mois: "2026-11-01", consultes: 10, repondus: 4 })).toBe("22 · commande du 1er novembre : 4 négoces sur 10 ont répondu");
    expect(compteurAdmin({ zone: "22", mois: "2026-11-01", consultes: 0, repondus: 0 })).toBe("22 · commande du 1er novembre : aucun négoce consulté");
  });
});
