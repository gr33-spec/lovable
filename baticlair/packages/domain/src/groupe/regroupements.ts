import { clesDeCommande, datesDuCycle, CONFIG_CYCLE_DEFAUT, type ConfigCycle, type Mois } from "./commande-du-mois.js";
import type { FamilleGroupe } from "./groupe.js";
import { referenceStricte, type ReferenceStricte, type RefusReference } from "./reference-stricte.js";

/**
 * LES REGROUPEMENTS (Greg, 25 octobre 2026, recentrage) : quand d'autres artisans du secteur ont besoin du même GROS
 * article, on réunit les volumes pour tenter un meilleur prix. Ce fichier ne fait que des calculs, sans base ni IA :
 * - une ligne est groupable si sa famille l'est (config), si sa référence est stricte (`referenceStricte`) et si son
 *   montant estimé atteint `SEUIL_LIGNE_GROUPABLE` (1 000 € HT par défaut) ;
 * - l'estimation vient du dernier prix payé par l'artisan, sinon d'un PRIX REPÈRE de la config ; sans l'un ni l'autre,
 *   la ligne n'est pas proposée (« en cas de doute, pas de regroupement ») ;
 * - un regroupement sous `SEUIL_VOLUME_MIN` de sa famille à la clôture n'est pas consulté : ses participants basculent ;
 * - sous `SEUIL_ANONYMAT` participants, on dit seulement « Regroupement en cours » ; au-dessus, « 5+ entreprises » et le
 *   département, jamais une commune ni un nom ;
 * - le négoce fixe la validité de son offre, 7 jours au moins ;
 * - l'artisan choisit « ce cycle » ou « le suivant » (clôtures du 1er et du 15 à midi, `commande-du-mois.ts`).
 */

/** Les familles dont les gros articles se regroupent (Greg : « couverture : ardoise, zinc, bois ; charpente ; isolation… »). */
export const FAMILLES_GROUPABLES_DEFAUT: readonly FamilleGroupe[] = ["couverture", "charpente", "second_oeuvre"];
/** Le montant HT estimé d'une ligne en dessous duquel elle ne se regroupe pas (euros). */
export const SEUIL_LIGNE_GROUPABLE_DEFAUT = 1000;
/** Le nombre de participants sous lequel on n'affiche que « Regroupement en cours ». */
export const SEUIL_ANONYMAT_DEFAUT = 5;
/** Validité minimale d'une offre de négoce, en jours. */
export const VALIDITE_MIN_JOURS = 7;

/**
 * Le volume minimum d'un regroupement à la clôture, en euros HT estimés, par famille. CHIFFRES DE DÉPART À VALIDER PAR
 * GREG (DECISIONS.md, 25 octobre 2026) ; la variable `SEUIL_VOLUME_MIN` les remplace (« couverture=5000,charpente=4000 »).
 */
export const SEUIL_VOLUME_MIN_DEFAUT: Readonly<Partial<Record<FamilleGroupe, number>>> = { couverture: 5000, charpente: 4000, second_oeuvre: 3000 };

/**
 * Les prix repères HT par type d'article et par unité, qui servent seulement à ESTIMER si une ligne dépasse le seuil.
 * Vides par défaut (aucun chiffre inventé) : la variable `PRIX_REPERES` les donne (« ardoise:pieces=1.2,zinc:m=18 »).
 */
export type PrixReperes = Readonly<Record<string, number>>;

/** Lit une liste « cle=valeur,cle2=valeur2 » (variables d'environnement). Une valeur non numérique est ignorée. */
export function lireTableNombres(texte: string | null | undefined): Record<string, number> {
  const t: Record<string, number> = {};
  for (const morceau of (texte ?? "").split(",")) {
    const [cle, valeur] = morceau.split("=").map((s) => s?.trim());
    const n = Number(valeur?.replace(",", "."));
    if (cle && Number.isFinite(n) && n >= 0) t[cle] = n;
  }
  return t;
}

/** L'unité ramenée à une forme (« pièces », « pc », « u » → « pieces » ; « ml », « m » → « m »). */
export function uniteRepere(unite: string): string {
  const u = unite.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\.$/, "");
  if (/^(pieces?|pcs?|u|unites?|ardoises?|plaques?|panneaux?|bacs?)$/.test(u)) return "pieces";
  if (/^(m|ml|metres?( lineaires?)?)$/.test(u)) return "m";
  if (/^(m2|m²|metres? carres?)$/.test(u)) return "m2";
  if (/^(m3|m³)$/.test(u)) return "m3";
  if (/^rouleaux?$/.test(u)) return "rouleaux";
  if (/^kg$/.test(u)) return "kg";
  return u;
}

export interface LigneACandidater {
  designation: string;
  quantite: number;
  unite: string;
  famille: string;
}

export type RefusGroupable = RefusReference | "famille" | "sans_estimation" | "sous_le_seuil";

export interface LigneGroupable {
  reference: ReferenceStricte;
  /** Le montant HT estimé de la ligne (euros) et d'où vient le prix. */
  estimeHt: number;
  source: "mes_prix" | "repere";
}

/**
 * Une ligne groupable, ou la raison du refus. `dernierPrix` : le dernier prix unitaire HT payé par CET artisan pour cette
 * clé (« Mes prix »), qui passe avant le repère.
 */
export function ligneGroupable(
  l: LigneACandidater,
  o: { familles?: readonly string[]; seuilHt?: number; reperes?: PrixReperes; dernierPrix?: (cle: string, unite: string) => number | null } = {},
): { ok: true; ligne: LigneGroupable } | { ok: false; raison: RefusGroupable } {
  const r = referenceStricte(l.designation);
  if (!r.ok) return { ok: false, raison: r.raison };
  const familles = o.familles ?? FAMILLES_GROUPABLES_DEFAUT;
  // La famille de la référence fait foi ; celle de la ligne doit être groupable aussi (un lot « électricité » qui citerait du bois ne passe pas).
  if (!familles.includes(r.reference.famille) || !familles.includes(l.famille)) return { ok: false, raison: "famille" };
  const unite = uniteRepere(l.unite);
  const mien = o.dernierPrix?.(r.reference.cle, unite) ?? null;
  const repere = o.reperes?.[`${r.reference.type}:${unite}`] ?? null;
  const pu = mien ?? repere;
  if (pu === null || !(l.quantite > 0)) return { ok: false, raison: "sans_estimation" };
  const estimeHt = Math.round(pu * l.quantite * 100) / 100;
  if (estimeHt < (o.seuilHt ?? SEUIL_LIGNE_GROUPABLE_DEFAUT)) return { ok: false, raison: "sous_le_seuil" };
  return { ok: true, ligne: { reference: r.reference, estimeHt, source: mien !== null ? "mes_prix" : "repere" } };
}

/** La phrase d'un refus, pour l'écran (tutoiement). */
export function phraseRefusGroupable(raison: RefusGroupable): string {
  switch (raison) {
    case "accessoire":
      return "Les petits accessoires ne se regroupent pas : garde-les dans ta demande perso.";
    case "famille":
      return "Cette famille ne se regroupe pas encore : garde cette ligne dans ta demande perso.";
    case "type_inconnu":
    case "attribut_manquant":
    case "ambigu":
      return "Référence pas assez précise pour être regroupée (format, épaisseur, origine…) : garde-la dans ta demande perso.";
    case "sans_estimation":
    case "sous_le_seuil":
      return "Ligne trop petite pour un prix de groupe : garde-la dans ta demande perso.";
  }
}

/** Le volume d'un regroupement atteint-il son minimum ? (euros HT estimés de toutes les quantités confirmées) */
export function volumeAtteint(famille: string, totalEstimeHt: number, seuils: Readonly<Partial<Record<string, number>>> = SEUIL_VOLUME_MIN_DEFAUT): boolean {
  return totalEstimeHt >= (seuils[famille] ?? 0);
}

/**
 * Ce qu'on dit des participants d'un regroupement : jamais un nom, jamais une commune ; sous le seuil, seulement « en
 * cours » ; au-dessus, « 5+ entreprises » et le département.
 */
export function phraseParticipants(n: number, departement: string, seuil = SEUIL_ANONYMAT_DEFAUT): { titre: string; detail: string | null } {
  if (n < seuil) return { titre: "Regroupement en cours", detail: null };
  return { titre: `${seuil}+ entreprises`, detail: `Département ${departement}` };
}

/** Les statuts d'un participant : jamais de commande annoncée avant le clic « Commander ». */
export const STATUTS_PARTICIPATION = ["intention", "quantite_confirmee", "commande", "bascule", "retire"] as const;
export type StatutParticipation = (typeof STATUTS_PARTICIPATION)[number];
export const LIBELLES_PARTICIPATION: Readonly<Record<StatutParticipation, string>> = {
  intention: "Tu as rejoint",
  quantite_confirmee: "Quantité confirmée",
  commande: "Commandé",
  bascule: "Basculé",
  retire: "Retiré",
};

/** Le passage d'un statut à l'autre. */
export function passageParticipation(de: StatutParticipation, vers: StatutParticipation): boolean {
  const permis: Readonly<Record<StatutParticipation, readonly StatutParticipation[]>> = {
    intention: ["quantite_confirmee", "bascule", "retire"],
    quantite_confirmee: ["commande", "bascule"],
    commande: [],
    bascule: [],
    retire: [],
  };
  return permis[de].includes(vers);
}

/** La validité d'une offre de négoce : un nombre entier de jours, 7 au moins. */
export function validiteAcceptee(jours: number): boolean {
  return Number.isInteger(jours) && jours >= VALIDITE_MIN_JOURS && jours <= 365;
}

/** La fin de validité d'une offre, et si elle tient encore. */
export function finDeValidite(deposeLe: Date, jours: number): Date {
  return new Date(deposeLe.getTime() + jours * 86_400_000);
}
export const offreValide = (deposeLe: Date, jours: number, maintenant: Date) => maintenant.getTime() <= finDeValidite(deposeLe, jours).getTime();

/**
 * « Ce cycle » ou « le suivant » : les deux prochaines clôtures (1er et 15 à midi), avec leur date. Pas de délai à la
 * carte. L'artisan prend la première dont la clôture laisse passer sa date de besoin (le négoce répond en 5 jours ouvrés).
 */
export function cyclesAuChoix(maintenant: Date, config: ConfigCycle = CONFIG_CYCLE_DEFAUT, fermes: readonly Mois[] = []): { cle: Mois; clotureLe: Date; reponseAvant: Date }[] {
  return clesDeCommande(maintenant, config, 6)
    .filter((c) => !fermes.includes(c))
    .map((c) => ({ cle: c, ...datesDuCycle(c, config) }))
    .filter((d) => maintenant < d.clotureLe)
    .slice(0, 2)
    .map((d) => ({ cle: d.cle, clotureLe: d.clotureLe, reponseAvant: d.reponseAvant }));
}

/** Le cycle conseillé pour une date de besoin : le premier dont les réponses arrivent avant ; sinon le premier. */
export function cycleConseille(choix: readonly { cle: Mois; reponseAvant: Date }[], dateBesoin: Date | null): Mois | null {
  if (!choix.length) return null;
  if (!dateBesoin) return choix[0]!.cle;
  return (choix.find((c) => c.reponseAvant.getTime() <= dateBesoin.getTime()) ?? choix[0]!).cle;
}

/**
 * Le message à la clôture quand le volume minimum n'est pas atteint : rien ne part aux négoces, le participant bascule
 * d'un clic (cycle suivant ou demande perso).
 */
export function phraseVolumeNonAtteint(libelle: string): string {
  return `Pas assez de volume pour ${libelle} ce cycle : on ne consulte pas les négoces. Bascule sur le cycle suivant ou sur une demande perso, en un clic.`;
}
