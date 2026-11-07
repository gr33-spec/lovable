import { describe, expect, it } from "vitest";
import { actionPrioritaire, comparerActions, etatCarte, lienAutres, statutAchatGroupe, statutDemande, type ActionCandidate } from "../src/index.js";

/**
 * L'ACCUEIL (Greg, 1er novembre 2026) : « À faire maintenant » montre UNE action, choisie par une règle stable ; les statuts
 * du suivi sont explicites (« Inscriptions ouvertes », jamais « Seul jusqu'au… »).
 */
const c = (cle: string, x: Partial<ActionCandidate> = {}): ActionCandidate => ({ cle, sorte: "brouillon-demande", immediate: false, echeance: null, modifieLe: null, ...x });

describe("« À faire maintenant » : la règle de priorité", () => {
  it("1. ce qui attend une réponse de l'artisan passe avant tout brouillon, même plus récent", () => {
    const { premiere } = actionPrioritaire([c("b", { modifieLe: "2026-11-01T08:00:00Z" }), c("o", { sorte: "achat-offre", immediate: true, modifieLe: "2026-10-01T08:00:00Z" })]);
    expect(premiere?.cle).toBe("o");
  });
  it("2. puis l'échéance la plus proche ; une action sans échéance vient après", () => {
    const { premiere, autres } = actionPrioritaire([
      c("sans", { immediate: true }),
      c("loin", { immediate: true, echeance: "2026-11-20T00:00:00Z" }),
      c("proche", { immediate: true, echeance: "2026-11-05T00:00:00Z" }),
    ]);
    expect([premiere?.cle, ...autres.map((a) => a.cle)]).toEqual(["proche", "loin", "sans"]);
  });
  it("3. puis le parcours modifié le plus récemment ; à égalité, l'ordre est fixe (la clé)", () => {
    const { premiere, autres } = actionPrioritaire([c("ancien", { modifieLe: "2026-10-30T10:00:00Z" }), c("recent", { modifieLe: "2026-11-01T06:00:00Z" }), c("z"), c("a")]);
    expect([premiere?.cle, ...autres.map((a) => a.cle)]).toEqual(["recent", "ancien", "a", "z"]);
    expect(comparerActions(c("a"), c("a"))).toBe(0);
  });
  it("rien à reprendre : aucune action (la section est masquée)", () => {
    expect(actionPrioritaire([])).toEqual({ premiere: null, autres: [] });
  });
  it("le lien : « Voir 1 autre brouillon », « Voir 3 autres brouillons », sinon « autres actions »", () => {
    expect(lienAutres([])).toBeNull();
    expect(lienAutres([c("x")])).toBe("Voir 1 autre brouillon");
    expect(lienAutres([c("x"), c("y", { sorte: "brouillon-liste" }), c("z", { sorte: "brouillon-achat" })])).toBe("Voir 3 autres brouillons");
    expect(lienAutres([c("x"), c("y", { sorte: "demande-reponses" })])).toBe("Voir 2 autres actions");
  });
});

describe("« Suivi en cours » : des statuts explicites", () => {
  it("achat groupé : inscriptions, consultation, offres reçues, choix à confirmer, terminée ; rien pour une participation finie", () => {
    expect(["seul", "regroupe", "regroupe_total"].map((e) => statutAchatGroupe(e as "seul")?.libelle)).toEqual(["Inscriptions ouvertes", "Inscriptions ouvertes", "Inscriptions ouvertes"]);
    expect(statutAchatGroupe("consultation")?.libelle).toBe("Consultation des négoces");
    expect(statutAchatGroupe("validation")).toEqual({ libelle: "Offres reçues", ton: "vert" });
    expect(statutAchatGroupe("offre")?.libelle).toBe("Choix à confirmer");
    expect(statutAchatGroupe("commande")?.libelle).toBe("Terminée");
    for (const e of ["retire", "desiste", "sorti", "non_commande"] as const) expect(statutAchatGroupe(e)).toBeNull();
  });
  it("demande de prix : le vert seulement quand une réponse est vraiment reçue", () => {
    expect(statutDemande({ negoces: 3, reponses: 0, choisi: false })).toEqual({ libelle: "Consultation des négoces", ton: "neutre" });
    expect(statutDemande({ negoces: 3, reponses: 1, choisi: false })).toEqual({ libelle: "1 réponse reçue", ton: "vert" });
    expect(statutDemande({ negoces: 3, reponses: 2, choisi: false }).libelle).toBe("2 réponses reçues");
    expect(statutDemande({ negoces: 3, reponses: 2, choisi: true }).libelle).toBe("Terminée");
  });
  it("la carte d'un achat groupé ne dit plus « Seul jusqu'au… »", () => {
    const titre = etatCarte({ statut: "ouvert", clotureLe: new Date("2026-11-15T12:00:00Z"), reponseAvantLe: null, entreprises: 1, total: null }, { statut: "declare" }).titre;
    expect(titre).toBe("Inscriptions ouvertes jusqu'au 15 novembre");
    expect(titre).not.toMatch(/Seul/);
  });
});
