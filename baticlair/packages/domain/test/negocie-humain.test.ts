import { describe, expect, it } from "vitest";
import {
  afficherPreviens,
  articleNegociable,
  arrondiObservatoire,
  commissionDe,
  datesCompatibles,
  domaineDeLEntreprise,
  lienSms,
  lireModeRegroupement,
  passageRegroupement,
  phrasePrixRepere,
  phraseVeille,
  prixAffiche,
  prixObserve,
  participantsNegocie,
  rejointLeRegroupement,
  veilleANotifier,
  verifierNegoce,
  type ObservationPrix,
} from "../src/index.js";

/**
 * LE REGROUPEMENT NÉGOCIÉ PAR UN HUMAIN (Greg, 25 octobre 2026, « business model final ») : gros articles seulement,
 * correspondance stricte, dates compatibles, commission intégrée au prix, veille, observatoire, vérification des négoces.
 */
describe("mode humain", () => {
  it("le mode par défaut est automatique (27 octobre 2026) ; l'humain reste possible", () => {
    expect(lireModeRegroupement(undefined)).toBe("automatique");
    expect(lireModeRegroupement("automatique")).toBe("automatique");
    expect(lireModeRegroupement("n'importe quoi")).toBe("automatique");
  });

  it("gros articles seulement : ardoise, zinc, bois, liteaux, isolant ; jamais crochets ni visserie (liteaux admis le 26 octobre 2026)", () => {
    expect(articleNegociable("Ardoise naturelle 32×22 Espagne 1er choix").ok).toBe(true);
    expect(articleNegociable("Zinc naturel 0,65 mm bobine 500 mm").ok).toBe(true);
    expect(articleNegociable("Liteau sapin traité 27×38").ok).toBe(true);
    expect(articleNegociable("Liteaux 27×38").ok).toBe(true);
    expect(articleNegociable("Plaque de plâtre BA13 2500×1200")).toEqual({ ok: false, raison: "non_negociable" });
    expect(articleNegociable("Crochet inox 100 mm").ok).toBe(false);
    expect(articleNegociable("Vis inox 4,5×35 boîte de 200").ok).toBe(false);
  });

  it("peinture (plan peintres, point 3, 27 octobre 2026) : teinte et contenance exigées ; un blanc ne rejoint jamais un gris ; la clé de l'ardoise ne change pas", () => {
    const blanc = articleNegociable("Peinture blanc mat 15 L");
    const blanc2 = articleNegociable("Blanc mat professionnel, pot de 15 L");
    const gris = articleNegociable("Peinture grise mat 15 L");
    if (!blanc.ok || !blanc2.ok || !gris.ok) throw new Error("peintures");
    expect(blanc.reference.cle).toBe(blanc2.reference.cle);
    expect(blanc.reference.cle).not.toBe(gris.reference.cle);
    expect(blanc.reference.libelle).toBe("Peinture blanc mat 15 L");
    expect(articleNegociable("Sous-couche 15 L").ok).toBe(true);
    expect(articleNegociable("Peinture 15 L").ok).toBe(false);
    expect(articleNegociable("Peinture blanche").ok).toBe(false);
    expect(articleNegociable("Peinture blanc mat 10 L").ok && articleNegociable("Peinture blanc mat 10 L")).not.toEqual(blanc);
    const ardoise = articleNegociable("Ardoise naturelle 32×22");
    if (!ardoise.ok) throw new Error("ardoise");
    expect(ardoise.reference.cle).toBe("ardoise|format=32x22|epaisseur=|largeur=|aspect=|conditionnement=|origine=|qualite=|marque=");
  });

  it("30×20 ne rejoint jamais 32×22 ; même département, dates à 30 jours au plus", () => {
    const a = articleNegociable("Ardoise naturelle 32×22 Espagne 1er choix");
    const b = articleNegociable("Ardoise naturelle 30×20 Espagne 1er choix");
    if (!a.ok || !b.ok) throw new Error("références");
    expect(a.reference.cle).not.toBe(b.reference.cle);
    const r = { cle: a.reference.cle, departement: "22", dateBesoinMin: new Date("2026-11-10"), statut: "en_collecte" as const };
    expect(rejointLeRegroupement({ cle: a.reference.cle, departement: "22", dateBesoin: new Date("2026-12-05") }, r)).toBe(true);
    expect(rejointLeRegroupement({ cle: b.reference.cle, departement: "22", dateBesoin: new Date("2026-11-10") }, r)).toBe(false);
    expect(rejointLeRegroupement({ cle: a.reference.cle, departement: "29", dateBesoin: new Date("2026-11-10") }, r)).toBe(false);
    expect(rejointLeRegroupement({ cle: a.reference.cle, departement: "22", dateBesoin: new Date("2027-01-20") }, r)).toBe(false);
    expect(rejointLeRegroupement({ cle: a.reference.cle, departement: "22", dateBesoin: new Date("2026-11-10") }, { ...r, statut: "commande" })).toBe(false);
    expect(datesCompatibles(new Date("2026-11-01"), new Date("2026-12-01"))).toBe(true);
  });

  it("les statuts du regroupement avancent dans l'ordre", () => {
    expect(passageRegroupement("en_collecte", "en_negociation")).toBe(true);
    expect(passageRegroupement("en_negociation", "offre_recue")).toBe(true);
    expect(passageRegroupement("offre_recue", "commande")).toBe(true);
    expect(passageRegroupement("en_collecte", "commande")).toBe(false);
    expect(passageRegroupement("commande", "abandonne")).toBe(false);
  });

  it("la commission est intégrée au prix affiché, comptée sur la quantité acceptée", () => {
    expect(prixAffiche(0.9, 2)).toBe(0.918);
    expect(prixAffiche(12.5, 2)).toBe(12.75);
    expect(commissionDe(0.9, 0.918, 2000)).toBe(36);
  });

  it("anonymat : « Regroupement en cours » sous 5 entreprises, « 5+ entreprises » et le département au-dessus", () => {
    expect(participantsNegocie(3, "22")).toEqual({ titre: "Regroupement en cours", detail: null });
    expect(participantsNegocie(6, "22")).toEqual({ titre: "5+ entreprises", detail: "Département 22" });
  });

  it("la veille : une notification, jamais après une commande perso ni après la date de besoin", () => {
    const now = new Date("2026-11-01T10:00:00Z");
    const b = { statut: "veille" as const, notifieLe: null, dateBesoin: new Date("2026-11-20"), commandeEnPerso: false };
    expect(veilleANotifier(b, now)).toBe(true);
    expect(veilleANotifier({ ...b, notifieLe: now }, now)).toBe(false);
    expect(veilleANotifier({ ...b, commandeEnPerso: true }, now)).toBe(false);
    expect(veilleANotifier({ ...b, dateBesoin: new Date("2026-10-20") }, now)).toBe(false);
    expect(phraseVeille("Ardoise 32×22", "1 800 pièces", "Lannion")).toBe("Un regroupement se forme sur Ardoise 32×22 dans ton secteur. Tu as 1 800 pièces dans le chantier Lannion, tu les ajoutes ?");
  });

  it("l'observatoire : moyenne arrondie sur 3 mois, seulement à partir de 2 regroupements ou 5 réponses distinctes", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    const o = (prix: number, type: "perso" | "groupe", source: string, jours = 10): ObservationPrix => ({ article: "A", prixUnitaireHt: prix, departement: "22", le: new Date(now.getTime() - jours * 86_400_000), type, source });
    const quatre = [o(1.1, "perso", "r1"), o(1.0, "perso", "r2"), o(1.2, "perso", "r3"), o(1.05, "perso", "r4")];
    expect(prixObserve(quatre, "A", "22", now)).toBeNull();
    expect(prixObserve([...quatre, o(1.15, "perso", "r5")], "A", "22", now)).toEqual({ environ: 1.1, regroupements: 0, reponses: 5 });
    expect(prixObserve([o(0.9, "groupe", "g1"), o(0.92, "groupe", "g2")], "A", "22", now)?.environ).toBe(0.91);
    // Plus de 3 mois : ignoré ; un autre département : ignoré.
    expect(prixObserve([o(0.9, "groupe", "g1"), o(0.92, "groupe", "g2", 120)], "A", "22", now)).toBeNull();
    expect(prixObserve([o(0.9, "groupe", "g1"), o(0.92, "groupe", "g2")], "A", "29", now)).toBeNull();
    expect(arrondiObservatoire(12.37)).toBe(12.5);
    expect(arrondiObservatoire(345.6)).toBe(346);
    expect(phrasePrixRepere(1.07, 1.1, "22")).toBe("Ton dernier prix : 1,07 €. Prix observé dans le 22 : environ 1,10 €.");
    expect(phrasePrixRepere(null, null, "22")).toBeNull();
  });

  it("vérification des négoces : SIRET inconnu, fermé ou hors matériaux = refus ; domaine pro = validé ; Gmail = à vérifier", () => {
    const pointp = { trouvee: true, active: true, naf: "4673A", nom: "POINT P" };
    expect(verifierNegoce(null, "a@b.fr")).toEqual({ statut: "refuse", raison: "inconnue" });
    expect(verifierNegoce({ ...pointp, active: false }, "a@pointp.fr")).toEqual({ statut: "refuse", raison: "fermee" });
    expect(verifierNegoce({ ...pointp, naf: "56.10A" }, "a@pointp.fr")).toEqual({ statut: "refuse", raison: "activite" });
    expect(verifierNegoce(pointp, "agence@pointp.fr")).toEqual({ statut: "valide" });
    expect(verifierNegoce(pointp, "point.p.lannion@gmail.com")).toEqual({ statut: "a_verifier", raison: "domaine" });
    expect(domaineDeLEntreprise("contact@bigmat-ploubalay.fr", "BIGMAT PLOUBALAY")).toBe(true);
    expect(domaineDeLEntreprise("contact@autre.fr", "BIGMAT PLOUBALAY")).toBe(false);
  });

  it("« Préviens ton négoce » : seulement pour un négoce qui n'a jamais répondu, jusqu'à ce qu'il réponde", () => {
    expect(afficherPreviens({ aDejaReponduSurMobiiz: false, prevenuLe: null })).toBe(true);
    expect(afficherPreviens({ aDejaReponduSurMobiiz: true, prevenuLe: null })).toBe(false);
    expect(afficherPreviens({ aDejaReponduSurMobiiz: false, prevenuLe: new Date() })).toBe(false);
    expect(lienSms("06 12 34 56 78")).toMatch(/^sms:0612345678\?&body=Salut%2C%20je%20t'envoie/);
  });
});
