import { DELAI_REPONSE_JOURS } from "./demande.js";
import type { FenetreLivraison } from "./groupe.js";

/**
 * LE CHOIX DU NÉGOCE (parcours groupé, étape 6), en code pur : « pour chaque lot, prix de chaque négoce au volume ferme,
 * délai dans la fenêtre ; un seul négoce retenu, le moins cher qui couvre tout le lot. Jamais de répartition entre
 * plusieurs négoces. » Une lecture « à vérifier » n'est jamais retenue (Greg la relit), et ne bloque pas le lot.
 */
const JOUR = 24 * 3600 * 1000;

export interface PrixDePalier {
  /** La quantité du palier telle qu'écrite (« 100 »), ou vide quand le prix vaut pour tout volume. */
  palier: string | null;
  prixUnitaire: string | null;
  totalHt: string | null;
}

export interface ReponseAChoisir {
  negoceId: string;
  /** en_attente | lue | a_verifier | echec */
  statutExtraction: string;
  prix: readonly PrixDePalier[];
  delaiJours: number | null;
  deposeLe: Date | null;
  pasConcerneLe: Date | null;
  /**
   * Nouveau cap (22 octobre) : le total des livraisons du négoce sur les zones du lot (prix par zone obligatoire). Le moins
   * cher se juge livraison comprise ; absent (anciennes réponses), zéro.
   */
  livraisonHt?: number | null;
}

export type RaisonEcart = "sans_depot" | "pas_concerne" | "a_verifier" | "sans_prix" | "palier_insuffisant" | "hors_fenetre" | "plus_cher";

export interface ChoixDuLot {
  retenu: { negoceId: string; prixUnitaire: number; dateLivraison: Date } | null;
  ecartes: { negoceId: string; raison: RaisonEcart }[];
}

/** « 1 720,00 » → 1720 ; « 18,50 » → 18.5 ; vide ou illisible → null. */
export function nombreFr(texte: string | number | null | undefined): number | null {
  // Un prix déjà en nombre (jeu de démonstration) se lit tel quel.
  if (typeof texte === "number") return Number.isFinite(texte) ? texte : null;
  if (!texte) return null;
  const t = texte.replace(/[\s €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/**
 * Le prix unitaire qui vaut pour le volume ferme : le plus grand palier qui ne dépasse pas le volume (le prix « à partir
 * de 100 » ne vaut pas pour 46) ; un prix sans palier vaut pour tout volume. Rien d'applicable : null.
 */
export function prixAuVolume(prix: readonly PrixDePalier[], volumeFerme: number): number | null {
  let meilleur: { palier: number; prix: number } | null = null;
  let sansPalier: number | null = null;
  for (const p of prix) {
    const pu = nombreFr(p.prixUnitaire);
    if (pu === null) continue;
    const q = nombreFr(p.palier);
    if (q === null) {
      sansPalier = sansPalier === null ? pu : Math.min(sansPalier, pu);
      continue;
    }
    if (q > volumeFerme) continue;
    if (!meilleur || q > meilleur.palier || (q === meilleur.palier && pu < meilleur.prix)) meilleur = { palier: q, prix: pu };
  }
  return meilleur ? meilleur.prix : sansPalier;
}

/** La livraison promise : dépôt + délai, jamais avant le début de la fenêtre ; sans délai écrit, le début de la fenêtre. */
export function dateDeLivraison(r: Pick<ReponseAChoisir, "deposeLe" | "delaiJours">, fenetre: FenetreLivraison): Date {
  if (!r.deposeLe || r.delaiJours === null) return fenetre.tot;
  const promise = new Date(r.deposeLe.getTime() + r.delaiJours * JOUR);
  return promise < fenetre.tot ? fenetre.tot : promise;
}

export function choisirLeNegoce(lot: { volumeFerme: number; fenetre: FenetreLivraison }, reponses: readonly ReponseAChoisir[]): ChoixDuLot {
  const ecartes: ChoixDuLot["ecartes"] = [];
  const candidats: { negoceId: string; prixUnitaire: number; dateLivraison: Date; total: number }[] = [];
  for (const r of reponses) {
    if (r.pasConcerneLe) ecartes.push({ negoceId: r.negoceId, raison: "pas_concerne" });
    else if (!r.deposeLe) ecartes.push({ negoceId: r.negoceId, raison: "sans_depot" });
    else if (r.statutExtraction !== "lue") ecartes.push({ negoceId: r.negoceId, raison: "a_verifier" });
    else {
      const pu = prixAuVolume(r.prix, lot.volumeFerme);
      const dateLivraison = dateDeLivraison(r, lot.fenetre);
      if (pu === null) ecartes.push({ negoceId: r.negoceId, raison: r.prix.some((p) => nombreFr(p.prixUnitaire) !== null) ? "palier_insuffisant" : "sans_prix" });
      else if (dateLivraison > lot.fenetre.tard) ecartes.push({ negoceId: r.negoceId, raison: "hors_fenetre" });
      else candidats.push({ negoceId: r.negoceId, prixUnitaire: pu, dateLivraison, total: pu * lot.volumeFerme + (r.livraisonHt ?? 0) });
    }
  }
  candidats.sort((a, b) => a.total - b.total || a.dateLivraison.getTime() - b.dateLivraison.getTime());
  const premier = candidats[0];
  const retenu = premier ? { negoceId: premier.negoceId, prixUnitaire: premier.prixUnitaire, dateLivraison: premier.dateLivraison } : null;
  for (const c of candidats.slice(1)) ecartes.push({ negoceId: c.negoceId, raison: "plus_cher" });
  return { retenu, ecartes };
}

/** Le lot se décide quand tous les négoces ont répondu (dépôt ou « pas concerné »), ou passé le délai de réponse. */
export function lotADecider(lot: { envoyeLe: Date | null }, reponses: readonly Pick<ReponseAChoisir, "deposeLe" | "pasConcerneLe">[], maintenant: Date): boolean {
  if (!lot.envoyeLe) return false;
  if (reponses.length > 0 && reponses.every((r) => r.deposeLe || r.pasConcerneLe)) return true;
  return maintenant.getTime() >= lot.envoyeLe.getTime() + DELAI_RESPONSE_MS();
}
const DELAI_RESPONSE_MS = () => DELAI_REPONSE_JOURS * JOUR;

/** Section 6 : économie affichée = (prix de référence − prix groupé) × quantité ; sans prix de référence, rien. */
export function economieEstimee(prixReference: number | null, prixUnitaire: number, quantite: number): number | null {
  if (prixReference === null || !Number.isFinite(prixReference)) return null;
  return Math.round((prixReference - prixUnitaire) * quantite * 100) / 100;
}
