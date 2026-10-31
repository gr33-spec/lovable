import { describe, expect, it } from "vitest";
import {
  CATALOGUE_ACHATS_GROUPES,
  arbreCatalogue,
  famillesDuCatalogue,
  commissionAchatGroupe,
  datesAchatGroupe,
  dateBesoinPossible,
  decisionAlerte,
  deLaPartDe,
  demandeNegoce,
  ecranPrevenir,
  estActiviteBatiment,
  estCommerceDeGros,
  etatCarte,
  jaugeVolume,
  jugerOffres,
  participantSuspect,
  phraseAlerte,
  phraseResumeAlertes,
  questionRattachement,
  rattachementPropose,
  rechercherCatalogue,
  referenceStricte,
  smsPrevenir,
  volumeMinimum,
  vueOffresArtisan,
} from "../src/index.js";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026) : dates, catalogue, rattachement d'une ligne, jauge de volume, états
 * de la carte, alertes, demande au négoce, comparaison des offres, ce que voit l'artisan, anti-fraude, « Préviens ».
 */
const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("les dates d'un achat groupé", () => {
  it("clôture = date de besoin − livraison − réponse ; échéance = clôture + réponse", () => {
    const { clotureLe, reponseAvantLe } = datesAchatGroupe(d("2026-11-30"), 10, 3);
    expect(clotureLe.toISOString()).toBe("2026-11-17T10:00:00.000Z");
    expect(reponseAvantLe.toISOString()).toBe("2026-11-20T10:00:00.000Z");
    expect(dateBesoinPossible(d("2026-11-30"), d("2026-11-16"), 10, 3)).toBe(true);
    expect(dateBesoinPossible(d("2026-11-30"), d("2026-11-18"), 10, 3)).toBe(false);
  });
});

describe("le catalogue et le rattachement d'une ligne (précision 2)", () => {
  it("chaque référence du catalogue se regroupe (règle stricte), et la recherche trouve par mots", () => {
    for (const e of CATALOGUE_ACHATS_GROUPES) expect(referenceStricte(e.designation).ok, e.designation).toBe(true);
    expect(rechercherCatalogue("ardoise 32").map((e) => e.designation)).toEqual(["Ardoise naturelle 32×22 Espagne 1er choix", "Ardoise naturelle 32×22 Angers 1er choix"]);
    expect(rechercherCatalogue("blanc mat")[0]!.designation).toBe("Peinture blanc mat 15 L");
  });
  it("la question de confirmation, avec le bon article ; sans référence, pas de rattachement", () => {
    const r = rattachementPropose("Ardoise 32x22 Espagne 1er choix")!;
    expect(r.question).toBe("C'est bien de l'ardoise 32×22 Espagne 1er choix ?");
    expect(rattachementPropose("Liteaux 27x38")!.question).toBe("C'est bien des liteaux 27×38 ?");
    expect(questionRattachement({ type: "zinc", libelle: "Zinc 0,65 mm naturel" })).toBe("C'est bien du zinc 0,65 mm naturel ?");
    expect(rattachementPropose("Ardoise")).toBeNull();
    expect(rattachementPropose("Crochets inox")).toBeNull();
  });
});

describe("le volume minimum et sa jauge (précision 3)", () => {
  it("par famille ; jauge par quart ; le reste dit seulement à partir du seuil d'anonymat", () => {
    expect(volumeMinimum("couverture")).toBe(5000);
    expect(volumeMinimum("couverture", { couverture: 8000 })).toBe(8000);
    expect(jaugeVolume(2600, 5000, 2)).toEqual({ pourcent: 50, atteint: false, phrase: null });
    expect(jaugeVolume(2600, 5000, 5)!.phrase).toBe("Il faut encore environ 2 400 € HT pour lancer la consultation.");
    expect(jaugeVolume(6000, 5000, 2)).toEqual({ pourcent: 100, atteint: true, phrase: "Volume suffisant pour lancer la consultation." });
    expect(jaugeVolume(null, 5000, 2)).toBeNull();
  });
});

describe("la carte : un état à la fois", () => {
  const base = { statut: "en_collecte", clotureLe: d("2026-11-17"), reponseAvantLe: d("2026-11-20"), total: null };
  it("seul, regroupé, regroupé 5+ avec total, consultés, offre, pas assez, commandé, désisté", () => {
    expect(etatCarte({ ...base, entreprises: 1 }, { statut: "declare" }).titre).toBe("Seul jusqu'au 17 novembre");
    expect(etatCarte({ ...base, entreprises: 3 }, { statut: "declare" }).titre).toBe("Avec d'autres artisans du secteur");
    expect(etatCarte({ ...base, entreprises: 3, total: "6 000 pièces" }, { statut: "declare" }).titre).toBe("Avec d'autres artisans du secteur");
    expect(etatCarte({ ...base, entreprises: 5, total: "9 000 pièces" }, { statut: "declare" }).titre).toBe("5 artisans du secteur · 9 000 pièces au total");
    expect(etatCarte({ ...base, statut: "consultation", entreprises: 2 }, { statut: "declare" }).titre).toBe("Négoces consultés, réponse le 20 novembre");
    expect(etatCarte({ ...base, statut: "offre_recue", entreprises: 2 }, { statut: "declare" }).etat).toBe("offre");
    expect(etatCarte({ ...base, statut: "pas_assez", entreprises: 1 }, { statut: "declare" }).titre).toBe("Pas assez de volume cette fois");
    expect(etatCarte({ ...base, entreprises: 2 }, { statut: "accepte" }).etat).toBe("commande");
    expect(etatCarte({ ...base, statut: "consultation", entreprises: 2 }, { statut: "desiste" }).etat).toBe("desiste");
    expect(etatCarte({ ...base, entreprises: 1 }, { statut: "declare" }).sousTitre).toBe("On te prévient dès qu'il y a du nouveau.");
  });
});

describe("les alertes (point 2)", () => {
  it("la phrase mot pour mot, deux par jour au plus, le reste en résumé", () => {
    expect(phraseAlerte({ libelle: "Ardoise 32×22 Espagne 1er choix", dateBesoin: d("2026-11-30"), zone: "22", clotureLe: d("2026-11-17") })).toBe(
      "Nouvel achat groupé : Ardoise 32×22 Espagne 1er choix, livraison avant le 30 novembre, secteur 22. Rejoins-le avant le 17 novembre.",
    );
    expect(decisionAlerte("toutes", 0)).toBe("maintenant");
    expect(decisionAlerte("toutes", 2)).toBe("resume");
    expect(decisionAlerte("resume", 0)).toBe("resume");
    expect(decisionAlerte("aucune", 0)).toBe("rien");
    expect(phraseResumeAlertes([{ libelle: "Zinc", zone: "22", clotureLe: d("2026-11-17") }, { libelle: "Liteaux", zone: "22", clotureLe: d("2026-11-18") }])).toBe("2 nouveaux achats groupés près de chez toi : Zinc, Liteaux.");
  });
});

describe("la demande au négoce (point 3)", () => {
  it("de la part de SES clients, volume, référence, livraisons, règles, lien", () => {
    expect(deLaPartDe(["Bati Invest", "Le Goff"])).toBe("De la part de vos clients Bati Invest et Le Goff, via Mobiiz");
    expect(deLaPartDe(["Bati Invest"])).toBe("De la part de votre client Bati Invest, via Mobiiz");
    const m = demandeNegoce({ clients: ["Bati Invest", "Le Goff"], libelle: "Ardoise 32×22 Espagne 1er choix", quantiteTotale: "3 000", unite: "pièces", livraisons: [{ commune: "Lannion", date: d("2026-11-30"), quantite: "1 800" }], reponseAvantLe: d("2026-11-20"), commandeAvantLe: d("2026-11-20"), lien: "https://x/achat-groupe/offre/abc", commissionPct: 2 });
    expect(m.objet).toBe("Demande de prix groupée : 3 000 pièces d'ardoise 32×22 Espagne 1er choix (réponse avant le 20 novembre)");
    for (const p of ["Vous n'êtes pas le seul négoce consulté.", "Une seule offre possible, sans deuxième tour : faites votre meilleur prix.", "livraison comprise", "même si le volume final est un peu inférieur", "https://x/achat-groupe/offre/abc", "commission Mobiiz de 2 %"]) expect(m.texte).toContain(p);
    expect(commissionAchatGroupe(3, { defaut: 2, lancement: 0, premiers: 10 })).toBe(0);
    expect(commissionAchatGroupe(11, { defaut: 2, lancement: 0, premiers: 10 })).toBe(2);
    expect(commissionAchatGroupe(1, { defaut: 2, lancement: null, premiers: 10 })).toBe(2);
  });
});

describe("l'analyse des offres (point 4) et ce que voit l'artisan (point 5)", () => {
  const cle = referenceStricte("Ardoise 32x22 Espagne 1er choix").ok ? (referenceStricte("Ardoise 32x22 Espagne 1er choix") as { reference: { cle: string } }).reference.cle : "";
  it("une offre douteuse n'est jamais mise en avant ; la meilleure est la moins chère des valides", () => {
    const { jugees, meilleure } = jugerOffres(
      [
        { id: "a", prixUnitaireHt: 1.1, designationLue: null, quantiteCouverte: null, delaiJours: 5, doutes: [], livraisonEnSus: false },
        { id: "b", prixUnitaireHt: 0.9, designationLue: "Ardoise 40x22 Espagne 1er choix", quantiteCouverte: 3000, delaiJours: 5, doutes: [], livraisonEnSus: false },
        { id: "c", prixUnitaireHt: 1.0, designationLue: "Ardoise 32×22 Espagne 1er choix", quantiteCouverte: 3000, delaiJours: 5, doutes: [], livraisonEnSus: false },
        { id: "d", prixUnitaireHt: 0.95, designationLue: null, quantiteCouverte: 2000, delaiJours: 5, doutes: [], livraisonEnSus: false },
        { id: "e", prixUnitaireHt: 0.8, designationLue: null, quantiteCouverte: null, delaiJours: 5, doutes: ["prix peu lisible"], livraisonEnSus: false },
      ],
      { cle, quantiteTotale: 3000, delaiMaxJours: 10 },
    );
    expect(jugees.map((j) => [j.id, j.valide, j.raisons])).toEqual([["a", true, []], ["b", false, ["reference"]], ["c", true, []], ["d", false, ["ligne_manquante"]], ["e", false, ["lecture"]]]);
    expect(meilleure!.id).toBe("c");
  });
  it("mon négoce, la meilleure, l'économie sur MA quantité ; le nom seulement à un abonné avec quantité", () => {
    const v = vueOffresArtisan({ quantite: 1800, mesNegoces: [{ nom: "Négoce A", prixUnitaireHt: 1.1, valide: true }], meilleure: { nom: "Négoce C", prixUnitaireHt: 1.0, estUnDesMiens: false }, abonne: true });
    expect(v).toEqual({ mien: { nom: "Négoce A", totalHt: 1980 }, meilleure: { nom: "Négoce C", totalHt: 1800, prixUnitaireHt: 1.0 }, economieHt: 180 });
    expect(vueOffresArtisan({ quantite: 1800, mesNegoces: [], meilleure: { nom: "Négoce C", prixUnitaireHt: 1.0, estUnDesMiens: false }, abonne: false }).meilleure!.nom).toBeNull();
  });
});

describe("anti-fraude (point 9) et « Préviens ton négoce » (point 12)", () => {
  it("bâtiment oui, commerce de gros non ; 3 participations sans commande = signalé", () => {
    expect(estActiviteBatiment("43.91A")).toBe(true);
    expect(estActiviteBatiment("46.73A")).toBe(false);
    expect(estCommerceDeGros("46.73A")).toBe(true);
    expect(participantSuspect(3, 0)).toBe(true);
    expect(participantSuspect(3, 1)).toBe(false);
  });
  it("l'écran et le SMS, mot pour mot", () => {
    expect(ecranPrevenir({ volumeTotal: "3 000 pièces", libelle: "Ardoise 32×22", clotureLe: d("2026-11-17") })).toBe(
      "Ton négoce va recevoir une grosse demande : 3 000 pièces d'ardoise 32×22, le 17 novembre, de la part de Mobiiz. C'est une belle opportunité pour lui. Préviens-le pour qu'il ne passe pas à côté, et dis-lui qu'il n'aura qu'une seule offre à faire : son meilleur prix.",
    );
    expect(smsPrevenir({ libelle: "Ardoise 32×22", clotureLe: d("2026-11-17"), prenom: "Greg", entreprise: "Bati Invest" })).toBe(
      "Bonjour, je participe à un achat groupé Mobiiz pour ardoise 32×22. Vous allez recevoir la demande de prix le 17 novembre, avec le volume total. Une seule offre possible, merci de nous faire votre meilleur prix. Greg, Bati Invest",
    );
  });
});

describe("l'arbre de choix du catalogue (Greg, 27 octobre 2026 : « un seul bouton ardoise, puis format, puis choix »)", () => {
  it("chaque référence a son métier et un chemin d'au moins deux boutons, sans doublon de feuille", () => {
    const feuilles = new Set<string>();
    for (const e of CATALOGUE_ACHATS_GROUPES) {
      expect(e.chemin.length, e.designation).toBeGreaterThanOrEqual(2);
      const cle = `${e.famille}/${e.chemin.join("/")}`;
      expect(feuilles.has(cle), cle).toBe(false);
      feuilles.add(cle);
    }
    expect(famillesDuCatalogue()).toEqual(["couverture", "charpente", "second_oeuvre"]);
  });
  it("couverture : Ardoise → 32×22 → Espagne 1er choix porte la référence ; un bouton intermédiaire n'en porte pas", () => {
    const arbre = arbreCatalogue("couverture");
    expect(arbre.map((n) => n.libelle)).toEqual(["Ardoise", "Zinc", "Liteaux", "Voliges"]);
    const ardoise = arbre[0]!;
    expect(ardoise.reference).toBeNull();
    expect(ardoise.enfants.map((n) => n.libelle)).toEqual(["32×22", "40×22", "40×25", "30×20", "Fibres-ciment"]);
    const f32 = ardoise.enfants[0]!;
    expect(f32.enfants.map((n) => n.libelle)).toEqual(["Espagne 1er choix", "Angers 1er choix"]);
    expect(f32.enfants[0]!.reference).toEqual({ designation: "Ardoise naturelle 32×22 Espagne 1er choix", unite: "pièces" });
    expect(arbreCatalogue("charpente").map((n) => n.libelle)).toEqual(["Chevrons", "Bastaings", "OSB"]);
    expect(arbreCatalogue("plomberie")).toEqual([]);
  });
});
