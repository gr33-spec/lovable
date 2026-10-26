import { describe, expect, it } from "vitest";
import {
  bonDuMois,
  classerLesGrilles,
  comparatifDeLArtisan,
  CONDITIONS_NEGOCE,
  CONDITIONS_NEGOCE_VERSION,
  finDeGarantie,
  fraisDeLivraisonPaliers,
  lirePaliers,
  mailClotureSansCompte,
  mailGrilleAuNegoce,
  mailInvitationNegoce,
  mailLienDeConnexion,
  mentionGarantie,
  mentionPrixFerme,
  PALIERS_DEFAUT,
  phrasePaliers,
  prixChezUnNegoce,
  titreGarantie,
  type CommandeDArtisan,
  type GrilleChiffree,
} from "../src/index.js";

/**
 * L'ESPACE NÉGOCE AUTONOME (Greg, 23 octobre 2026) : paliers de livraison communs aux dépôts, « ne livre pas ta zone »,
 * prix non garantis (indicatifs, hors total), grille garantie 30 jours, textes vouvoyés sans nom d'artisan, conditions
 * en dix points.
 */
describe("les paliers de livraison (point 2)", () => {
  it("par défaut : gratuite jusqu'à 30 km, 80 € jusqu'à 60 km, rien au-delà de 100 km", () => {
    expect(PALIERS_DEFAUT).toEqual({ gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 60, prixHt: 80 }], maxKm: 100 });
    expect(fraisDeLivraisonPaliers(0, PALIERS_DEFAUT)).toBe(0);
    expect(fraisDeLivraisonPaliers(30, PALIERS_DEFAUT)).toBe(0);
    expect(fraisDeLivraisonPaliers(31, PALIERS_DEFAUT)).toBe(80);
    expect(fraisDeLivraisonPaliers(60, PALIERS_DEFAUT)).toBe(80);
    // Entre le dernier palier payant et la distance maximale : le dernier palier vaut encore.
    expect(fraisDeLivraisonPaliers(90, PALIERS_DEFAUT)).toBe(80);
    expect(fraisDeLivraisonPaliers(101, PALIERS_DEFAUT)).toBeNull();
    // Deux paliers payants.
    const deux = { gratuiteJusquaKm: 20, paliers: [{ jusquaKm: 50, prixHt: 45 }, { jusquaKm: 100, prixHt: 90 }], maxKm: 120 };
    expect([10, 40, 75, 110, 130].map((km) => fraisDeLivraisonPaliers(km, deux))).toEqual([0, 45, 90, 90, null]);
    // Une distance inconnue : jamais gratuite ; le dernier palier payant, ou pas livrable sans palier payant.
    expect(fraisDeLivraisonPaliers(null, PALIERS_DEFAUT)).toBe(80);
    expect(fraisDeLivraisonPaliers(null, { gratuiteJusquaKm: 30, paliers: [], maxKm: 30 })).toBeNull();
    expect(phrasePaliers(PALIERS_DEFAUT)).toBe("Livraison gratuite jusqu'à 30 km, 80 € HT jusqu'à 60 km, pas de livraison au-delà de 100 km.");
  });

  it("la saisie : distances croissantes, deux paliers au plus, nombres positifs, « 45,00 » accepté", () => {
    expect(lirePaliers({ gratuiteJusquaKm: "30", paliers: [{ jusquaKm: "60", prixHt: "45,00" }], maxKm: "100" })).toEqual({ gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 60, prixHt: 45 }], maxKm: 100 });
    expect(lirePaliers({ gratuiteJusquaKm: 30, paliers: [], maxKm: 30 })).toEqual({ gratuiteJusquaKm: 30, paliers: [], maxKm: 30 });
    expect(lirePaliers({ gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 20, prixHt: 45 }], maxKm: 100 })).toBeNull();
    expect(lirePaliers({ gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 60, prixHt: 45 }], maxKm: 50 })).toBeNull();
    expect(lirePaliers({ gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 40, prixHt: 1 }, { jusquaKm: 50, prixHt: 2 }, { jusquaKm: 60, prixHt: 3 }], maxKm: 100 })).toBeNull();
    expect(lirePaliers({ gratuiteJusquaKm: -1, paliers: [], maxKm: 10 })).toBeNull();
    expect(lirePaliers(null)).toBeNull();
  });
});

describe("le prix livré depuis le dépôt le plus proche, « ne livre pas ta zone », prix non garantis", () => {
  const A: CommandeDArtisan = { companyId: "A", chantiers: 2, distances: { N1: [10, 70], N2: [10, 130] }, lignes: [{ cle: "ardoise#pièces", designation: "Ardoise", quantite: 1000, unite: "pièces" }, { cle: "zinc#m", designation: "Zinc", quantite: 100, unite: "m" }] };
  const N1: GrilleChiffree = { negoceId: "N1", prix: { "ardoise#pièces": 1, "zinc#m": 10 }, livraison: PALIERS_DEFAUT, nonGarantis: ["zinc#m"] };
  const N2: GrilleChiffree = { negoceId: "N2", prix: { "ardoise#pièces": 0.9, "zinc#m": 9 }, livraison: PALIERS_DEFAUT };

  it("N1 : 1 000 € d'ardoises, le zinc indicatif (hors total), livraisons 0 + 80 € ; N2 ne livre pas le second chantier (130 km > 100)", () => {
    const p1 = prixChezUnNegoce(A, N1);
    expect(p1).toMatchObject({ marchandiseHt: 1000, livraisonHt: 80, totalHt: 1080, manquantes: 0, complet: true, livrable: true, indicatives: [{ cle: "zinc#m", prixUnitaire: 10 }] });
    const p2 = prixChezUnNegoce(A, N2);
    expect(p2).toMatchObject({ livrable: false, complet: false, indicatives: [] });
  });

  it("le classement : une grille qui ne livre pas un artisan passe derrière ; le comparatif ne retient jamais un négoce qui ne livre pas", () => {
    const lignes = A.lignes;
    const classement = classerLesGrilles([N2, N1], lignes, [A]);
    expect(classement.map((c) => [c.negoceId, c.complete, c.nonLivres, c.rang])).toEqual([
      ["N1", true, 0, 1],
      ["N2", false, 1, 2],
    ]);
    const comp = comparatifDeLArtisan(A, [N1, N2], classement);
    expect(comp.parDefaut).toBe("N1");
    expect(comp.moinsCherPourToi).toBe("N1");
    expect(comp.lignes.map((l) => [l.negoceId, l.livrable])).toEqual([
      ["N1", true],
      ["N2", false],
    ]);
  });
});

describe("la grille garantie 30 jours (point 6) et les mentions des bons", () => {
  it("résultats publiés le 22 octobre à 18 h : garantie jusqu'au 21 novembre", () => {
    const fin = finDeGarantie(new Date("2026-10-22T16:00:00.000Z"));
    expect(fin.toISOString()).toBe("2026-11-21T16:00:00.000Z");
    expect(titreGarantie(fin)).toBe("Prix garantis jusqu'au 21 novembre");
    expect(mentionGarantie("2026-10-15")).toBe("Commande sur grille garantie du 15 octobre");
    expect(mentionPrixFerme("2026-10-15")).toBe("Prix ferme du regroupement du 15 octobre");
  });

  it("le bon de commande porte le prix ferme du cycle, ou la mention « grille garantie » pour une recommande", () => {
    const base = { numero: 7, mois: "2026-10-15", negoce: "Négoce N1", artisan: { nom: "Toitures A", siret: null, telephone: null, email: null }, numeroCompte: null, chantiers: ["Lannion"], lignes: [{ designation: "Ardoise", quantite: 100, unite: "pièces", prixUnitaire: 1 }], livraisonHt: 0 };
    const texte = (b: ReturnType<typeof bonDuMois>) => JSON.stringify(b);
    expect(texte(bonDuMois(base))).toContain("Prix ferme du regroupement du 15 octobre.");
    expect(texte(bonDuMois(base))).not.toContain("grille garantie");
    const g = bonDuMois({ ...base, garantie: true });
    expect(g.titre).toBe("Bon de commande, regroupement du 15 octobre n° 7 (grille garantie)");
    expect(texte(g)).toContain("Commande sur grille garantie du 15 octobre.");
  });
});

describe("les textes côté négoce : vouvoiement, jamais un nom d'artisan", () => {
  it("l'invitation nomme le secteur, jamais l'artisan ; le lien magique ; la clôture sans compte ; la grille prête", () => {
    const inv = mailInvitationNegoce({ lien: "https://b/negoce/rejoindre/x", departement: "22", conditions: "https://b/negoce/conditions", opposition: "https://b/negoce/opposition/o" });
    // RGPD (24 octobre 2026) : qui écrit, pourquoi, et le lien d'opposition.
    expect(inv.texte).toContain("Ce message vous est envoyé par BATI INVEST (Mobiiz) pour le regroupement.");
    expect(inv.texte).toContain("Ne plus jamais être contacté : https://b/negoce/opposition/o");
    expect(inv.objet).toBe("Des artisans de votre secteur vous ont ajouté au regroupement : créez votre accès");
    expect(inv.texte).toContain("Un artisan de votre secteur (22) vous a ajouté");
    expect(inv.texte).toContain("Créez votre accès en une minute");
    expect(inv.texte).toContain("valable 90 jours");
    expect(inv.texte).not.toMatch(/Toitures|tu |ton /);
    expect(mailLienDeConnexion({ lien: "https://b/negoce/connexion/y" }).texte).toContain("valable 30 minutes");
    const cl = mailClotureSansCompte({ mois: "2026-10-15", departement: "22", lien: "https://b/negoce/rejoindre/x", opposition: "https://b/negoce/opposition/o" });
    expect(cl.texte).toContain("Ne plus jamais être contacté : https://b/negoce/opposition/o");
    expect(cl.objet).toBe("La grille du 15 octobre (22) est prête : créez votre accès pour la chiffrer");
    const g = mailGrilleAuNegoce({ negoce: "N1", mois: "2026-10-15", departement: "22", lignes: [{ cle: "a", designation: "Ardoise", quantite: 10, unite: "pièces" }], reponseAvant: new Date("2026-10-22T16:00:00Z"), maintenant: new Date("2026-10-15T10:00:00Z"), lien: "https://b/grille/j", stop: "https://b/negoce/desabonner/s" });
    expect(g.objet).toBe("La grille du 15 octobre est prête (22) : 1 article à chiffrer");
    expect(g.texte).toContain("Se désabonner : https://b/negoce/desabonner/s");
    expect(g.texte).not.toContain("deux chiffres de livraison");
  });

  // Mise en conformité (Greg, 24 octobre 2026) : treize points, dont la grille unique, la concurrence, « ni vendeur ni
  // acheteur » et le versionnement ; la gratuité dans la formulation unique.
  it("les conditions : versionnées, dont grille unique, prix fermes, garantie 30 jours, paliers, confidentialité, concurrence, gratuité, désabonnement", () => {
    expect(CONDITIONS_NEGOCE).toHaveLength(18);
    expect(CONDITIONS_NEGOCE_VERSION).toBe("2026-10-26");
    const titres = CONDITIONS_NEGOCE.map((c) => c.titre);
    expect(titres).toEqual(expect.arrayContaining(["Une seule grille, la même pour tous", "Prix fermes, quel que soit le volume", "Garantie 30 jours si vous êtes retenu", "Livraison selon vos paliers", "Confidentialité des artisans", "Concurrence : vos prix restent les vôtres", "Ni vendeur ni acheteur", "Gratuit pour vous", "Non-sollicitation", "Désabonnement libre", "Liberté de ne pas répondre", "Versions et droit applicable", "Demandes perso", "Pas d'alignement automatique"]));
    expect(CONDITIONS_NEGOCE.find((c) => c.titre === "Gratuit pour vous")!.texte).toMatch(/^Aucun frais pour l'instant\. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce\. /);
    // Greg, 26 octobre 2026 : commission de 1 à 2 % sur les seuls regroupements négociés, facturée par BATI INVEST.
    expect(CONDITIONS_NEGOCE.find((c) => c.titre === "Regroupements négociés par Mobiiz")!.texte).toMatch(/commission de 1 à 2 % du montant HT .* BATI INVEST vous la facture après la livraison/);
    expect(CONDITIONS_NEGOCE.find((c) => c.titre === "Concurrence : vos prix restent les vôtres")!.texte).toContain("ni pendant ni après la consultation");
    for (const c of CONDITIONS_NEGOCE) expect(c.texte).not.toMatch(/\btu\b|\bton\b/);
  });
});
