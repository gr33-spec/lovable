import { normalizeText } from "../trades/trade-profile.js";

/**
 * L'APPRENTISSAGE DES CORRECTIONS (Greg, 24 octobre 2026). Chaque correction d'une ligne (le nom, la précision, la
 * quantité) est gardée avec ce que l'IA avait proposé, le changement et le métier ; seulement des données de chantier.
 *
 * - PAR ARTISAN : la même correction faite sur 2 chantiers différents s'applique d'elle-même ensuite, avec « Ajusté selon
 *   tes habitudes » et une annulation en un clic.
 * - POUR TOUS : la même correction faite par 3 artisans différents devient une règle PROPOSÉE à l'admin, qui la valide ou
 *   la refuse d'un clic ; aucune règle globale ne s'applique sans validation.
 *
 * Tout s'applique par le code (une réponse sur la ligne, comme une correction à la main), jamais par le modèle.
 */

export type ChampAppris = "libelle" | "precision" | "quantite";
export const CHAMPS_APPRIS: readonly ChampAppris[] = ["libelle", "precision", "quantite"];

export const SEUIL_HABITUDE = 2;
export const SEUIL_REGLE_GLOBALE = 3;
export const AJUSTE_HABITUDES = "Ajusté selon tes habitudes";
export const AJUSTE_ARTISANS = "Ajusté selon les habitudes des artisans";

/** La clé d'une proposition de l'IA : son nom, sans casse ni accents (« Écran HPV » = « ecran hpv »). */
export const cleDeProposition = (label: string): string => normalizeText(label).replace(/\s+/g, " ").trim();

const nombre = (t: string | number | null | undefined): number | null => {
  if (t === null || t === undefined) return null;
  const n = Number(String(t).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * Ce qu'une correction apprend : le nouveau nom, la précision, ou le FACTEUR de quantité (corrigée ÷ proposée, arrondi au
 * centième : « toujours 10 % de plus » = 1,1). Null quand il n'y a rien à apprendre (même valeur, quantité illisible).
 */
export function valeurApprise(champ: ChampAppris, avant: { label: string; count: string | number | null }, apres: string | { value: string; unit: string } | null): string | null {
  if (champ === "libelle") {
    const v = typeof apres === "string" ? apres.trim() : "";
    return v && cleDeProposition(v) !== cleDeProposition(avant.label) ? v : null;
  }
  if (champ === "precision") return typeof apres === "string" && apres.trim() ? apres.trim() : null;
  const propose = nombre(avant.count);
  const corrige = apres && typeof apres === "object" ? nombre(apres.value) : null;
  if (!propose || !corrige || propose <= 0) return null;
  const facteur = Math.round((corrige / propose) * 100) / 100;
  return facteur > 0 && facteur !== 1 ? String(facteur) : null;
}

/** Une occurrence de correction : quelle entreprise, quel chantier. */
export interface Occurrence {
  companyId: string;
  projectId: string;
  at: string;
}

/** La règle personnelle est active dès la même correction sur 2 chantiers différents. */
export const habitudeEtablie = (occ: readonly Occurrence[]): boolean => new Set(occ.map((o) => o.projectId)).size >= SEUIL_HABITUDE;

/** Une règle globale est proposée dès 3 artisans différents. */
export const regleGlobaleAProposer = (entreprises: readonly string[]): boolean => new Set(entreprises).size >= SEUIL_REGLE_GLOBALE;

/** La réponse que la règle pose sur la ligne : la même forme qu'une correction à la main. */
export function reponseApprise(champ: ChampAppris, valeur: string, item: { count: string | number | null; unit: string | null }): string | { value: string; unit: string } | null {
  if (champ !== "quantite") return valeur;
  const q = nombre(item.count);
  const f = nombre(valeur);
  if (!q || !f || !item.unit) return null;
  // Une quantité commandée est un nombre d'unités : arrondie au-dessus (jamais de demi-boîte).
  return { value: String(Math.ceil(q * f - 1e-9)), unit: item.unit };
}

/** La phrase d'une règle, pour l'admin : « « écran hpv » → nom « Écran HPV Delta-Vent » », « quantité × 1,1 ». */
export function phraseDeRegle(r: { cle: string; champ: ChampAppris; valeur: string }): string {
  if (r.champ === "libelle") return `« ${r.cle} » s'appelle « ${r.valeur} »`;
  if (r.champ === "precision") return `« ${r.cle} » : précision « ${r.valeur} »`;
  return `« ${r.cle} » : quantité × ${Number(r.valeur).toLocaleString("fr-FR")}`;
}

/** Le taux de correction d'un mois : la part des listes où l'artisan a corrigé au moins une ligne. */
export function tauxDeCorrection(listes: number, corrigees: number): number | null {
  return listes > 0 ? Math.round((corrigees / listes) * 1000) / 10 : null;
}
