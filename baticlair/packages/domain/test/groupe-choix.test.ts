/**
 * BATICLAIR GROUPÉ, ÉTAPE 6 : LE CHOIX DU NÉGOCE (document du fondateur, 2026-10-19, section 2 étape 6), en code pur :
 * le prix au volume ferme, le délai dans la fenêtre, un seul négoce, le moins cher qui couvre tout le lot ; une lecture
 * « à vérifier » jamais retenue ; le lot se décide quand tous ont répondu ou passé 7 jours ; l'économie estimée.
 */
import { describe, expect, it } from "vitest";
import { choisirLeNegoce, dateDeLivraison, economieEstimee, lotADecider, nombreFr, prixAuVolume, type ReponseAChoisir } from "../src/index.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const fenetre = { tot: d("2026-11-10"), tard: d("2026-11-20") };
const reponse = (negoceId: string, prix: { palier: string | null; prixUnitaire: string | null }[], extra: Partial<ReponseAChoisir> = {}): ReponseAChoisir => ({
  negoceId,
  statutExtraction: "lue",
  prix: prix.map((p) => ({ ...p, totalHt: null })),
  delaiJours: 5,
  deposeLe: d("2026-11-01"),
  pasConcerneLe: null,
  ...extra,
});

describe("groupé, étape 6 : le prix au volume ferme", () => {
  it("les nombres français ; le plus grand palier qui ne dépasse pas le volume ; un prix sans palier vaut pour tout", () => {
    expect(nombreFr("1 720,00")).toBe(1720);
    expect(nombreFr("18,50")).toBe(18.5);
    expect(nombreFr("18,50 €")).toBe(18.5);
    expect(nombreFr("sur devis")).toBeNull();
    const paliers = [
      { palier: "46", prixUnitaire: "18,50", totalHt: null },
      { palier: "100", prixUnitaire: "17,20", totalHt: null },
    ];
    expect(prixAuVolume(paliers, 46)).toBe(18.5);
    expect(prixAuVolume(paliers, 120)).toBe(17.2);
    // « À partir de 100 » ne vaut pas pour 46 : rien d'applicable.
    expect(prixAuVolume([paliers[1]!], 46)).toBeNull();
    expect(prixAuVolume([{ palier: null, prixUnitaire: "19,00", totalHt: null }], 46)).toBe(19);
    expect(prixAuVolume([{ palier: "46", prixUnitaire: null, totalHt: "851,00" }], 46)).toBeNull();
  });

  it("la livraison promise : dépôt + délai, jamais avant la fenêtre ; sans délai, le début de la fenêtre", () => {
    expect(dateDeLivraison({ deposeLe: d("2026-11-01"), delaiJours: 5 }, fenetre)).toEqual(d("2026-11-10"));
    expect(dateDeLivraison({ deposeLe: d("2026-11-08"), delaiJours: 5 }, fenetre)).toEqual(d("2026-11-13"));
    expect(dateDeLivraison({ deposeLe: d("2026-11-08"), delaiJours: null }, fenetre)).toEqual(d("2026-11-10"));
  });
});

describe("groupé, étape 6 : un seul négoce, le moins cher qui couvre tout le lot", () => {
  it("le moins cher au volume ferme gagne ; les autres sont écartés avec leur raison ; « à vérifier » jamais retenu", () => {
    const choix = choisirLeNegoce({ volumeFerme: 46, fenetre }, [
      reponse("cher", [{ palier: "46", prixUnitaire: "19,90" }]),
      reponse("moins-cher", [{ palier: "46", prixUnitaire: "18,50" }, { palier: "100", prixUnitaire: "17,20" }]),
      reponse("douteux", [{ palier: "46", prixUnitaire: "10,00" }], { statutExtraction: "a_verifier" }),
      reponse("trop-tard", [{ palier: "46", prixUnitaire: "15,00" }], { deposeLe: d("2026-11-18"), delaiJours: 10 }),
      reponse("palier-trop-haut", [{ palier: "100", prixUnitaire: "16,00" }]),
      reponse("muet", [], { deposeLe: null }),
      reponse("pas-concerne", [], { deposeLe: null, pasConcerneLe: d("2026-11-02") }),
    ]);
    expect(choix.retenu).toEqual({ negoceId: "moins-cher", prixUnitaire: 18.5, dateLivraison: d("2026-11-10") });
    expect(Object.fromEntries(choix.ecartes.map((e) => [e.negoceId, e.raison]))).toEqual({
      cher: "plus_cher",
      douteux: "a_verifier",
      "trop-tard": "hors_fenetre",
      "palier-trop-haut": "palier_insuffisant",
      muet: "sans_depot",
      "pas-concerne": "pas_concerne",
    });
    // Personne d'applicable : aucun retenu, jamais un prix « à vérifier » par défaut.
    expect(choisirLeNegoce({ volumeFerme: 46, fenetre }, [reponse("douteux", [{ palier: "46", prixUnitaire: "10,00" }], { statutExtraction: "a_verifier" })]).retenu).toBeNull();
    // À prix égal, la livraison la plus tôt.
    const egal = choisirLeNegoce({ volumeFerme: 46, fenetre }, [reponse("tard", [{ palier: null, prixUnitaire: "18,50" }], { delaiJours: 15 }), reponse("tot", [{ palier: null, prixUnitaire: "18,50" }], { delaiJours: 5 })]);
    expect(egal.retenu?.negoceId).toBe("tot");
  });

  it("le lot se décide quand tous ont répondu, ou passé 7 jours ; l'économie = (référence − groupé) × quantité", () => {
    const lot = { envoyeLe: d("2026-11-01") };
    expect(lotADecider(lot, [{ deposeLe: d("2026-11-02"), pasConcerneLe: null }, { deposeLe: null, pasConcerneLe: null }], d("2026-11-03"))).toBe(false);
    expect(lotADecider(lot, [{ deposeLe: d("2026-11-02"), pasConcerneLe: null }, { deposeLe: null, pasConcerneLe: d("2026-11-02") }], d("2026-11-03"))).toBe(true);
    expect(lotADecider(lot, [{ deposeLe: null, pasConcerneLe: null }], d("2026-11-08"))).toBe(true);
    expect(lotADecider(lot, [], d("2026-11-03"))).toBe(false);
    expect(lotADecider({ envoyeLe: null }, [], d("2026-12-01"))).toBe(false);
    expect(economieEstimee(21, 18.5, 23)).toBe(57.5);
    expect(economieEstimee(null, 18.5, 23)).toBeNull();
    // Plan « finition » (22 octobre) : la livraison du chantier se retire, comme dans le prix livré de la même carte.
    expect(economieEstimee(21, 18.5, 23, 45)).toBe(12.5);
  });
});
