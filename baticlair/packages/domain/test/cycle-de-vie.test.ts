/**
 * Greg, 6 novembre 2026 (prompt maître, points 7, 9 et 19) : le cycle de vie complet ; une ligne n'est jamais engagée deux fois ;
 * une commande seule d'une ligne tenue par un achat groupé attend un geste explicite ; rien n'est annulé en silence.
 */
import { describe, expect, it } from "vitest";
import { estFinal, etatDemande, etatLigne, etatParticipation, peut, transitionCycle, type FaitsLigne } from "../src/index.js";

const libre: FaitsLigne = { demandeEnvoyee: false, commandeeSeule: false, enRecherche: false, groupe: null };
const groupe = (statut: string, avantCloture = true) => ({ ...libre, groupe: { titre: "Couverture · secteur Lannion", statut, avantCloture } });

describe("le cycle de vie", () => {
  it("l'état d'une ligne : la commande l'emporte, puis l'achat groupé, la recherche, la demande", () => {
    expect(etatLigne(libre)).toBe("libre");
    expect(etatLigne({ ...libre, demandeEnvoyee: true })).toBe("demande_envoyee");
    expect(etatLigne({ ...libre, demandeEnvoyee: true, enRecherche: true })).toBe("en_recherche");
    expect(etatLigne({ ...groupe("declare"), enRecherche: true })).toBe("dans_un_groupe");
    expect(etatLigne({ ...groupe("declare"), commandeeSeule: true })).toBe("commandee_seule");
    expect(etatLigne({ ...groupe("accepte"), commandeeSeule: true })).toBe("commandee_en_groupe");
  });

  it("une ligne ne rejoint jamais deux achats groupés et ne cherche plus une fois dedans", () => {
    expect(peut(groupe("declare"), "rejoindre_groupe", "Ardoise")).toMatchObject({ permis: false, raison: "deja_dans_un_groupe" });
    expect(peut(groupe("declare"), "chercher")).toMatchObject({ permis: false, raison: "deja_dans_un_groupe" });
    // Comparer les prix reste libre.
    expect(peut(groupe("declare"), "envoyer_demande")).toEqual({ permis: true });
  });

  it("commander seule une ligne d'un achat groupé : d'abord la retirer (avant la clôture), sinon en sortir", () => {
    const avant = peut(groupe("declare", true), "commander_seul", "Ardoise 32×22");
    expect(avant).toMatchObject({ permis: false, raison: "dans_un_groupe", deblocage: "retirer_du_groupe" });
    if (!avant.permis) expect(avant.message).toContain("retire-la d'abord de l'achat groupé");
    expect(peut(groupe("declare", false), "commander_seul")).toMatchObject({ permis: false, raison: "groupe_clos" });
    expect(peut(groupe("accepte"), "commander_seul")).toMatchObject({ permis: false, raison: "deja_commande_en_groupe" });
  });

  it("une ligne commandée seule ne rejoint rien et ne repart pas", () => {
    const c = { ...libre, commandeeSeule: true };
    for (const a of ["rejoindre_groupe", "chercher", "commander_seul", "envoyer_demande"] as const) expect(peut(c, a)).toMatchObject({ permis: false, raison: "deja_commande" });
    expect(peut(libre, "rejoindre_groupe")).toEqual({ permis: true });
    expect(peut({ ...libre, enRecherche: true }, "commander_seul")).toEqual({ permis: true });
  });

  it("les transitions : seulement celles des tables ; les états finaux n'ont plus de sortie", () => {
    expect(transitionCycle("demande", "envoyee", "commandee")).toBe(true);
    expect(transitionCycle("demande", "commandee", "envoyee")).toBe(false);
    expect(transitionCycle("participation", "engagee", "retiree")).toBe(true);
    expect(transitionCycle("participation", "engagee", "sortie")).toBe(false);
    expect(transitionCycle("participation", "commandee", "retiree")).toBe(false);
    expect(estFinal("participation", "livree")).toBe(true);
    expect(estFinal("demande", "envoyee")).toBe(false);
  });

  it("les états d'après les faits enregistrés", () => {
    expect(etatDemande({ envoyee: true, reponses: 2, commandee: false, livree: false, close: false })).toBe("reponses_recues");
    expect(etatDemande({ envoyee: true, reponses: 2, commandee: true, livree: false, close: true })).toBe("commandee");
    expect(etatParticipation({ statut: "declare", livre: false, achat: "ouvert" })).toBe("engagee");
    expect(etatParticipation({ statut: "declare", livre: false, achat: "publie" })).toBe("offre_publiee");
    expect(etatParticipation({ statut: "accepte", livre: true, achat: "publie" })).toBe("livree");
    expect(etatParticipation({ statut: "retire", livre: false, achat: "ouvert" })).toBe("retiree");
  });
});
