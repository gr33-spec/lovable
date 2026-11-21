import { describe, expect, it } from "vitest";
import { accompagnement, artisansDuMetier, compteARebours, deDepartement, DEPARTEMENTS, monActivite, phraseGroupe, type CarteActivite } from "../src/index.js";

/**
 * L'ACCUEIL PREMIUM (Greg, 20 novembre 2026) : « un dossier n'apparaît jamais deux fois » (la « Liste du 14 novembre »
 * était dans « À faire maintenant » ET dans « Mes demandes en cours ») ; la règle des 3 des achats groupés ; un chrono
 * calculé sur la vraie clôture, qui ne redémarre jamais ; « Rejoins les couvreurs des Côtes-d'Armor ».
 */
const carte = (dossier: string, x: Partial<CarteActivite> = {}): CarteActivite => ({ cle: `${dossier}-${x.info ?? ""}`, sorte: "demande-reponses", immediate: false, echeance: null, modifieLe: null, dossier, type: "Demande de prix", titre: dossier, info: "", action: "Ouvrir", href: `/chantiers/${dossier}`, ...x });

describe("Mon activité : un dossier, une carte", () => {
  it("la même liste vue par « À faire » et par « Mes demandes » n'a qu'une carte : la plus pressante", () => {
    const l = monActivite([
      carte("liste-14", { info: "Envoyée à 3 négoces", modifieLe: "2026-11-14T08:00:00Z" }),
      carte("liste-14", { info: "3 réponses reçues", action: "Comparer", immediate: true, modifieLe: "2026-11-14T08:00:00Z" }),
      carte("liste-12", { info: "Envoyée à 2 négoces", modifieLe: "2026-11-15T08:00:00Z" }),
    ]);
    expect(l.map((c) => `${c.dossier} ${c.info}`)).toEqual(["liste-14 3 réponses reçues", "liste-12 Envoyée à 2 négoces"]);
  });
  it("aucun dossier : rien (la section disparaît)", () => {
    expect(monActivite([])).toEqual([]);
  });
});

describe("Achats groupés : la règle des 3", () => {
  it("sous 3 entreprises : « En cours de regroupement », jamais le volume ni le nombre", () => {
    expect(phraseGroupe({ entreprises: 1, volume: null, regroupement: true })).toBe("En cours de regroupement");
    expect(phraseGroupe({ entreprises: 2, volume: "120 m²" })).toBe("En cours de regroupement");
    expect(phraseGroupe(null)).toBe("En cours de regroupement");
  });
  it("à partir de 3 : le nombre et le total seulement", () => {
    expect(phraseGroupe({ entreprises: 3, volume: "450 m²" })).toBe("3 entreprises · 450 m² au total");
  });
});

describe("Le chrono d'un achat groupé", () => {
  const cloture = "2026-11-21T18:00:00Z";
  const t = (iso: string) => Date.parse(iso);
  it("à plus de 48 h : pas de chrono", () => {
    expect(compteARebours(cloture, t("2026-11-19T17:59:00Z"))).toBeNull();
  });
  it("à moins de 48 h : il défile, calculé sur la vraie clôture", () => {
    expect(compteARebours(cloture, t("2026-11-20T18:45:55Z"))).toEqual({ clos: false, texte: "23:14:05" });
    expect(compteARebours(cloture, t("2026-11-20T18:45:56Z"))?.texte).toBe("23:14:04");
  });
  it("à zéro et après : clôturé, il ne redémarre jamais", () => {
    expect(compteARebours(cloture, t(cloture))).toEqual({ clos: true, texte: "00:00:00" });
    expect(compteARebours(cloture, t("2026-11-23T18:00:00Z"))?.clos).toBe(true);
  });
});

describe("« Rejoins les couvreurs des Côtes-d'Armor »", () => {
  it("l'article juste de chaque département", () => {
    expect(deDepartement("22", "Côtes-d'Armor")).toBe("des Côtes-d'Armor");
    expect(deDepartement("29", "Finistère")).toBe("du Finistère");
    expect(deDepartement("35", "Ille-et-Vilaine")).toBe("de l'Ille-et-Vilaine");
    expect(deDepartement("56", "Morbihan")).toBe("du Morbihan");
    expect(deDepartement("50", "Manche")).toBe("de la Manche");
    expect(deDepartement("75", "Paris")).toBe("de Paris");
  });
  it("chaque département de la table a son article, sauf ceux qui prennent « de »", () => {
    const sansArticle = DEPARTEMENTS.filter((d) => deDepartement(d.code, d.nom) === `de ${d.nom}`).map((d) => d.code);
    expect(sansArticle.sort()).toEqual(["75", "974", "976"].filter((c) => DEPARTEMENTS.some((d) => d.code === c)).sort());
  });
  it("le métier au pluriel ; plusieurs métiers ou un métier inconnu : « artisans »", () => {
    expect(artisansDuMetier(["roofing"])).toBe("couvreurs");
    expect(artisansDuMetier(["roofing", "painting"])).toBe("artisans");
    expect(artisansDuMetier(["inconnu"])).toBe("artisans");
  });
});

describe("L'accompagnement d'un nouveau compte", () => {
  it("les trois étapes se cochent d'après les vrais dossiers", () => {
    expect(accompagnement({ listes: 0, demandes: 0, groupesVus: false, besoinsGroupes: 0 }).map((e) => e.faite)).toEqual([false, false, false]);
    expect(accompagnement({ listes: 1, demandes: 1, groupesVus: false, besoinsGroupes: 1 }).map((e) => e.faite)).toEqual([true, true, true]);
  });
});
