/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026, V5.2 validée) : les règles pures. Tests obligatoires couverts ici :
 * une ligne jamais à la fois en demande individuelle et en achat groupé ; aucun volume indicatif ou non reconfirmé
 * transmis ; produit / date / réception différents = besoin séparé ; classement par lot d'une liste tapée ; famille non
 * autorisée gardée dans le quantitatif ; conversion de conditionnement à confirmer ; modifier ne retire pas.
 */
import { describe, expect, it } from "vitest";
import {
  actionsAFaireV1,
  apresCloture,
  calculOffreV1,
  circuitDeLigne,
  classerLigneV1,
  cleProduitV1,
  differencesV1,
  lireProduitV1,
  lotDeLaLigne,
  LOT_PARENT_V1,
  lotsComprisV1,
  manquesOffreV1,
  nomProduitV1,
  ouvertureV1,
  peutBesoinV1,
  peutCircuit,
  phraseAPreciser,
  phrasesVolumesV1,
  PHRASE_SOUS_5,
  preparationV1,
  quantiteAvecConversion,
  produitV1,
  statutAfficheV1,
  suiviRetraitsTardifs,
  transitionV1,
  volumesV1,
  RAISONS_NE_CONVIENT_PAS,
  LIBELLES_STATUT_V1,
  referenceStricte,
} from "../src/index.js";

const libre = { demandeEnvoyee: false, commandee: false, enRecherche: false, dansUnAchatGroupe: false };
const NOW = new Date("2026-11-07T10:00:00Z");

describe("une ligne, un seul circuit", () => {
  it("une ligne en demande individuelle ne rejoint jamais un achat groupé, et inversement", () => {
    const enDemande = { ...libre, demandeEnvoyee: true };
    expect(circuitDeLigne(enDemande)).toBe("demande_individuelle");
    expect(peutCircuit(enDemande, "rejoindre_achat_groupe").permis).toBe(false);
    const enGroupe = { ...libre, dansUnAchatGroupe: true };
    expect(circuitDeLigne(enGroupe)).toBe("achat_groupe");
    const v = peutCircuit(enGroupe, "envoyer_demande_individuelle", "Ardoise");
    expect(v.permis).toBe(false);
    expect(!v.permis && v.message).toContain("Retire d'abord ton besoin");
    expect(peutCircuit(enGroupe, "rejoindre_achat_groupe").permis).toBe(false);
  });
  it("une ligne commandée n'a plus aucun circuit ; une ligne surveillée peut rejoindre (la veille s'arrête, dite)", () => {
    const commandee = { ...libre, commandee: true, demandeEnvoyee: true };
    expect(peutCircuit(commandee, "rejoindre_achat_groupe").permis).toBe(false);
    expect(peutCircuit(commandee, "envoyer_demande_individuelle").permis).toBe(false);
    expect(peutCircuit({ ...libre, enRecherche: true }, "rejoindre_achat_groupe")).toEqual({ permis: true, arreterSurveillance: true });
    expect(peutCircuit({ ...libre, enRecherche: true }, "envoyer_demande_individuelle").permis).toBe(true);
  });
});

describe("produits autorisés et caractéristiques indispensables", () => {
  it("l'ardoise naturelle exige format, origine, choix et épaisseur ; sa clé ignore la façon d'écrire", () => {
    const lu = lireProduitV1("Ardoise naturelle 32x22 Espagne 1er choix 5 mm")!;
    expect(lu.type).toBe("ardoise");
    expect(cleProduitV1("ardoise", lu.attributs)).toBe("v1:ardoise|format=32x22|origine=espagne|qualite=1|epaisseur=5");
    expect(nomProduitV1("ardoise", lu.attributs)).toBe("Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm");
    expect(cleProduitV1("ardoise", lireProduitV1("ARDOISE 32 x 22 espagnole 1ère choix 5mm")!.attributs)).toBe(cleProduitV1("ardoise", lu.attributs));
    const sans = lireProduitV1("Ardoise naturelle 32x22 Espagne 1er choix")!;
    expect(cleProduitV1("ardoise", sans.attributs)).toBeNull();
  });
  it("un produit différent (format, épaisseur, origine) a une autre clé", () => {
    const a = cleProduitV1("ardoise", { format: "32x22", origine: "espagne", qualite: "1", epaisseur: "5" });
    expect(cleProduitV1("ardoise", { format: "35x25", origine: "espagne", qualite: "1", epaisseur: "5" })).not.toBe(a);
    expect(cleProduitV1("ardoise", { format: "32x22", origine: "espagne", qualite: "1", epaisseur: "4.5" })).not.toBe(a);
    expect(cleProduitV1("ardoise", { format: "32x22", origine: "france", qualite: "1", epaisseur: "5" })).not.toBe(a);
  });
  it("« À préciser » dit exactement ce qui manque, accordé", () => {
    const liteau = classerLigneV1({ designation: "Liteaux", quantite: 300, unite: "m", faits: libre });
    expect(liteau.mention).toBe("a_preciser");
    expect(liteau.texte).toBe("À préciser : section et essence manquantes");
    expect(liteau.selectionnable).toBe(false);
    expect(phraseAPreciser([{ libelle: "Épaisseur", feminin: true }])).toBe("À préciser : épaisseur manquante");
  });
  it("une famille non autorisée reste dans le quantitatif", () => {
    for (const d of ["Parpaing 20x20x50", "Clous inox 2,5 x 50", "Ardoise fibres-ciment 40x24", "Robinet thermostatique"]) {
      const c = classerLigneV1({ designation: d, quantite: 100, unite: "u", faits: libre });
      expect(c.mention, d).toBe("non_ouvert");
      expect(c.texte).toBe("Pas encore ouvert aux achats groupés");
      expect(c.selectionnable).toBe(false);
    }
  });
  it("la lecture stricte des anciens regroupements est inchangée", () => {
    expect(referenceStricte("Ardoise 32x22 Espagne").ok).toBe(true);
    expect(referenceStricte("Tuile Terreal").ok).toBe(false);
  });
});

describe("classement par lot d'une liste tapée à la main", () => {
  const liste = [
    ["Ardoise naturelle 32x22 Espagne 1er choix 5 mm", "couverture"],
    ["Crochets inox 100 mm", "couverture"],
    ["Liteaux", "couverture"],
    ["Gouttière zinc dév. 33", "zinguerie"],
    ["Écran sous toiture HPV 75 m2", "couverture"],
    ["Câble R2V 3G2,5 couronne 100 m", "electricite"],
    ["Laine de verre 200 mm", "isolation"],
    ["Ciment 35 kg", "maconnerie"],
    ["Plaque de plâtre BA13", "platrerie"],
    ["Fenêtre de toit GGL MK08", "couverture"],
    ["Truc inconnu", "divers"],
  ] as const;
  it.each(liste)("%s → %s", (d, lot) => expect(lotDeLaLigne(d)).toBe(lot));
  it("la zinguerie est un lot à part : le filtre Couverture ne comprend plus ses lignes (règle changée, Greg, 13 novembre 2026)", () => {
    expect(LOT_PARENT_V1.zinguerie).toBeUndefined();
    expect(lotsComprisV1("couverture")).toEqual(["couverture"]);
    expect(lotsComprisV1("zinguerie")).toEqual(["zinguerie"]);
    expect(lotsComprisV1("isolation")).toEqual(["isolation"]);
    // Le lot rangé ne change pas : aucune donnée réécrite.
    expect(lotDeLaLigne("Gouttière zinc demi-ronde de 33")).toBe("zinguerie");
  });
  it("la correction de l'artisan s'applique à SA ligne, sans toucher les autres", () => {
    const corrigee = classerLigneV1({ designation: "Crochets inox 100 mm", quantite: 950, unite: "u", lotChoisi: "zinguerie", faits: libre });
    expect(corrigee.lot).toBe("zinguerie");
    expect(corrigee.lotLu).toBe("couverture");
    expect(classerLigneV1({ designation: "Liteaux", quantite: 300, unite: "m", faits: libre }).lot).toBe("couverture");
  });
});

describe("mentions de la sélection", () => {
  it("recommandé (quantité adaptée), compatible (modeste), déjà en demande individuelle", () => {
    const reco = classerLigneV1({ designation: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: 10, unite: "palettes", faits: libre });
    expect(reco.mention).toBe("recommande");
    expect(reco.quantite).toEqual({ valeur: 10, unite: "palette", conditionnement: { unite: "palette", parDefaut: 480 } });
    const cable = classerLigneV1({ designation: "Câble R2V 3G2,5", quantite: 6, unite: "couronnes", faits: libre });
    expect(cable.mention).toBe("compatible");
    const ecran = classerLigneV1({ designation: "Écran sous toiture HPV rouleau 75 m2", quantite: 3, unite: "rouleaux", faits: { ...libre, demandeEnvoyee: true } });
    expect(ecran.texte).toBe("Déjà dans une demande individuelle");
    expect(ecran.selectionnable).toBe(false);
  });
  it("une quantité dans une unité étrangère au produit est à préciser (jamais convertie en douce)", () => {
    const c = classerLigneV1({ designation: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: 120, unite: "m²", faits: libre });
    expect(c.mention).toBe("a_preciser");
    expect(c.texte).toBe("À préciser : quantité en pièces");
  });
});

describe("conditionnement", () => {
  it("la conversion est affichée, jamais garantie : 10 palettes = 4 800 pièces", () => {
    const p = produitV1("ardoise")!;
    expect(quantiteAvecConversion(p, 10, { unite: "palette", parUnite: 480 })).toBe("10 palettes = 4 800 pièces");
    expect(quantiteAvecConversion(produitV1("gouttiere")!, 40, null)).toBe("40 m");
    expect(p.conditionnements[0]!.parDefaut).toBe(480);
  });
});

describe("compatibilité : un achat par produit, zone, réception et période", () => {
  const achat = { cle: "k", departement: "22", reception: "livraison", dateBesoin: new Date("2027-01-20"), statut: "ouvert" as const, ouvertJusquau: new Date("2027-01-02T17:00:00Z") };
  it("identique = compatible (il faut le rejoindre, jamais en ouvrir un second)", () => {
    expect(differencesV1(achat, { cle: "k", departement: "22", reception: "livraison", dateBesoin: new Date("2027-01-27") }, NOW)).toEqual([]);
  });
  it("produit, date ou réception différents ouvrent un besoin séparé", () => {
    expect(differencesV1(achat, { cle: "k2", departement: "22", reception: "livraison", dateBesoin: new Date("2027-01-20") }, NOW)).toEqual(["produit"]);
    expect(differencesV1(achat, { cle: "k", departement: "22", reception: "retrait", dateBesoin: new Date("2027-01-20") }, NOW)).toEqual(["reception"]);
    expect(differencesV1(achat, { cle: "k", departement: "22", reception: "livraison", dateBesoin: new Date("2027-02-10") }, NOW)).toEqual(["date"]);
    expect(differencesV1(achat, { cle: "k", departement: "29", reception: "livraison", dateBesoin: new Date("2027-01-20") }, NOW)).toEqual(["zone"]);
  });
  it("les raisons proposées n'ont plus « Ma zone est différente » (zone = département de l'entreprise)", () => {
    expect(RAISONS_NE_CONVIENT_PAS.map((r) => r.libelle)).not.toContain("Ma zone est différente");
    expect(RAISONS_NE_CONVIENT_PAS).toHaveLength(3);
  });
  it("ouverture : jusqu'à 18 jours avant le besoin, refusée sous 21 jours", () => {
    const o = ouvertureV1(new Date("2027-01-20T00:00:00Z"), NOW);
    expect(o.ok && o.ouvertJusquau.toISOString()).toBe("2027-01-02T17:00:00.000Z");
    expect(ouvertureV1(new Date("2026-11-20T00:00:00Z"), NOW).ok).toBe(false);
  });
});

describe("cycle d'états", () => {
  it("les transitions absentes sont refusées ; « Offre acceptée » est inatteignable", () => {
    expect(transitionV1("achat", "ouvert", "preparation")).toBe(true);
    expect(transitionV1("achat", "ouvert", "consultation")).toBe(false);
    expect(transitionV1("achat", "offre_a_examiner", "offre_acceptee")).toBe(false);
    expect(transitionV1("achat", "renegociation", "offre_a_examiner")).toBe(false);
    expect(transitionV1("besoin", "retire", "confirme")).toBe(false);
    expect(transitionV1("besoin", "reconfirme", "confirme")).toBe(false);
    expect(Object.values(LIBELLES_STATUT_V1)).not.toContain("Offre acceptée");
  });
  it("modifier la quantité ou la date ne retire pas le besoin ; après la consultation, c'est transmis", () => {
    const m = peutBesoinV1({ statut: "ouvert", reconfirmerAvant: null }, { statut: "confirme" }, "modifier_date", NOW);
    expect(m).toEqual({ permis: true, transmis: false });
    const apres = peutBesoinV1({ statut: "consultation", reconfirmerAvant: null }, { statut: "reconfirme" }, "modifier_quantite", NOW);
    expect(apres).toEqual({ permis: true, transmis: true });
    expect(peutBesoinV1({ statut: "offre_a_examiner", reconfirmerAvant: null }, { statut: "reconfirme" }, "modifier_quantite", NOW).permis).toBe(false);
  });
  it("reconfirmer : seulement pendant la préparation, avant l'heure ; non reconfirmé = indicatif à la clôture", () => {
    const avant = new Date(NOW.getTime() + 3_600_000);
    expect(peutBesoinV1({ statut: "preparation", reconfirmerAvant: avant }, { statut: "confirme" }, "reconfirmer", NOW)).toMatchObject({ permis: true, vers: "reconfirme" });
    expect(peutBesoinV1({ statut: "preparation", reconfirmerAvant: new Date(NOW.getTime() - 1) }, { statut: "confirme" }, "reconfirmer", NOW).permis).toBe(false);
    expect(peutBesoinV1({ statut: "ouvert", reconfirmerAvant: null }, { statut: "confirme" }, "reconfirmer", NOW).permis).toBe(false);
    expect(apresCloture("confirme")).toBe("indicatif");
    expect(apresCloture("reconfirme")).toBe("reconfirme");
  });
  it("préparation : 72 h par défaut, 24 h à 5 jours, rappel 24 h avant", () => {
    const p = preparationV1(NOW);
    expect(p.ok && (p.reconfirmerAvant.getTime() - NOW.getTime()) / 3_600_000).toBe(72);
    expect(p.ok && (p.reconfirmerAvant.getTime() - p.rappelLe.getTime()) / 3_600_000).toBe(24);
    expect(preparationV1(NOW, 12).ok).toBe(false);
    expect(preparationV1(NOW, 121).ok).toBe(false);
  });
  it("statuts affichés aux textes exacts", () => {
    expect(LIBELLES_STATUT_V1[statutAfficheV1({ statut: "offre_verification" }, { statut: "reconfirme" })]).toBe("Offre reçue — vérification en cours");
    expect(LIBELLES_STATUT_V1[statutAfficheV1({ statut: "consultation" }, { statut: "indicatif" })]).toBe("Besoin indicatif");
    expect(LIBELLES_STATUT_V1[statutAfficheV1({ statut: "preparation" }, { statut: "confirme" })]).toBe("Préparation de la consultation");
  });
});

describe("volumes", () => {
  const besoins = [
    { companyId: "a", statut: "reconfirme" as const, quantite: 4800 },
    { companyId: "b", statut: "confirme" as const, quantite: 960 },
    { companyId: "c", statut: "indicatif" as const, quantite: 1440 },
    { companyId: "d", statut: "retire" as const, quantite: 9999 },
  ];
  it("aucun volume indicatif ou non reconfirmé n'est transmis ; rien avant la consultation", () => {
    expect(volumesV1(besoins, { statut: "preparation" }).transmis).toBe(0);
    const v = volumesV1(besoins, { statut: "consultation" });
    expect(v.transmis).toBe(4800);
    expect(v.confirmes).toBe(5760);
    expect(v.indicatifs).toBe(1440);
  });
  it("sous 5 entreprises, aucun volume ; au-delà, des totaux seulement", () => {
    expect(phrasesVolumesV1(volumesV1(besoins, { statut: "ouvert" }), { statut: "ouvert" }, { unite: { singulier: "palette", pluriel: "palettes", feminin: true }, parUnite: 480 }).principale).toBe(PHRASE_SOUS_5);
    const beaucoup = Array.from({ length: 12 }, (_, i) => ({ companyId: `c${i}`, statut: "confirme" as const, quantite: 3440 }));
    const aff = { unite: { singulier: "palette", pluriel: "palettes", feminin: true }, parUnite: 480 };
    const p = phrasesVolumesV1(volumesV1([...beaucoup, { companyId: "z", statut: "indicatif", quantite: 16320 }], { statut: "ouvert" }), { statut: "ouvert" }, aff);
    expect(p.principale).toBe("86 palettes de besoins confirmés par 12 entreprises");
    expect(p.sous).toBe("À reconfirmer avant consultation");
    expect(p.indicatif).toBe("34 palettes supplémentaires encore indicatives");
    const rec = beaucoup.map((b) => ({ ...b, statut: "reconfirme" as const }));
    expect(phrasesVolumesV1(volumesV1(rec, { statut: "consultation" }), { statut: "consultation" }, aff).principale).toBe("86 palettes confirmées pour la consultation");
  });
});

describe("offre et suivi", () => {
  it("calcul de la V4 : 4 800 × 0,98 € = 4 704,00 € + 45 € = 4 749,00 € HT ; TVA 949,80 € ; 5 698,80 € TTC", () => {
    const c = calculOffreV1(4800, { prixUnitaireHt: 0.98, livraisonHt: 45, tvaPct: 20 });
    expect(c).toMatchObject({ produits: 4704, ht: 4749, tva: 949.8, ttc: 5698.8 });
    expect(c.lignes).toEqual(["4 800 × 0,98 € = 4 704,00 €", "4 704,00 € + 45,00 € = 4 749,00 € HT", "TVA 20 % 949,80 €", "5 698,80 € TTC"]);
  });
  it("une offre incomplète reste en vérification", () => {
    expect(manquesOffreV1({ fournisseur: "Négoce de l'Armor", prixUnitaireHt: 0.98, livraisonHt: 45, tvaPct: 20, delai: "10 jours", lieu: null, paiement: "30 jours", validite: "72 h", annulation: " " })).toEqual(["lieu de livraison ou de retrait", "conditions d'annulation"]);
  });
  it("retraits tardifs : rappel à 3, puis vérification manuelle, jamais de suspension", () => {
    expect(suiviRetraitsTardifs(2)).toBe("aucun");
    expect(suiviRetraitsTardifs(3)).toBe("rappel");
    expect(suiviRetraitsTardifs(5)).toBe("verification_manuelle");
  });
  it("À faire : reconfirmer et examiner une offre, par échéance", () => {
    const a = actionsAFaireV1(
      [
        { id: "1", nom: "Ardoise", quantite: "10 palettes", statut: "confirme", achat: { statut: "preparation", reconfirmerAvant: new Date("2026-11-09T17:00:00Z"), offreAvant: null } },
        { id: "2", nom: "Crochets", quantite: "950 pièces", statut: "reconfirme", achat: { statut: "offre_a_examiner", reconfirmerAvant: null, offreAvant: new Date("2026-11-08T17:00:00Z") } },
        { id: "3", nom: "Retiré", quantite: "1", statut: "retire", achat: { statut: "preparation", reconfirmerAvant: null, offreAvant: null } },
      ],
      NOW,
    );
    expect(a.map((x) => x.cle)).toEqual(["ag-offre:2", "ag-reconfirmer:1"]);
  });
});

describe("cycle partagé : la demande individuelle refuse une ligne d'achat groupé V1", () => {
  it("envoyer_demande refusé seulement pour la V1 ; l'ancien achat groupé garde sa règle", async () => {
    const { peut } = await import("../src/index.js");
    const groupe = { titre: "Ardoise", statut: "declare", avantCloture: true };
    expect(peut({ demandeEnvoyee: false, commandeeSeule: false, enRecherche: false, groupe, achatGroupeV1: true }, "envoyer_demande").permis).toBe(false);
    expect(peut({ demandeEnvoyee: false, commandeeSeule: false, enRecherche: false, groupe }, "envoyer_demande").permis).toBe(true);
  });
});

describe("unités écrites par le moteur de liste", () => {
  it("« longueurs de 4 m » : conditionnement proposé (4 m), à confirmer ; « m » reste l'unité de référence", async () => {
    const { lireUnite, codeUnite } = await import("../src/index.js");
    expect(lireUnite("longueurs de 4 m")).toEqual({ code: "longueur", contenu: 4 });
    expect(lireUnite("couronnes de 100 m")).toEqual({ code: "couronne", contenu: 100 });
    expect(codeUnite("ml")).toBe("m");
    const c = classerLigneV1({ designation: "Gouttière zinc dév. 33", quantite: 10, unite: "longueurs de 4 m", faits: libre });
    expect(c).toMatchObject({ mention: "recommande", quantite: { valeur: 10, unite: "longueur", conditionnement: { unite: "longueur", parDefaut: 4 } } });
  });
});

describe("aucune ligne ne disparaît (Greg, 7 novembre 2026)", () => {
  it("chaque ligne d'une liste tapée reçoit une mention et une raison, même sans quantité", () => {
    const cas: [string, number, string, string, boolean][] = [
      ["Liteaux", 300, "m", "À préciser : section et essence manquantes", false],
      ["Liteaux sapin", 300, "m", "À préciser : section manquante", false],
      ["Liteaux 27x40 sapin", 300, "m", "Compatible avec un achat groupé", true],
      ["Liteaux 27x40 sapin", 0, "", "À préciser : quantité en m", false],
      ["Parpaing creux 20x20x50", 200, "u", "Pas encore ouvert aux achats groupés", false],
      ["Truc inconnu", 0, "", "Pas encore ouvert aux achats groupés", false],
    ];
    for (const [designation, quantite, unite, texte, selectionnable] of cas)
      expect(classerLigneV1({ designation, quantite, unite, faits: libre }), designation).toMatchObject({ texte, selectionnable });
  });
});
