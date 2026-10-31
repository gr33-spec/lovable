import { normalizeText } from "../trades/trade-profile.js";
import type { CommandeDArtisan, GrilleChiffree, LigneDeGrille } from "./commande-du-mois.js";
import { fraisDeLivraisonPaliers } from "./espace-negoce.js";
import { FAMILLES_GROUPE, type FamilleGroupe } from "./groupe.js";

/**
 * LISTES MULTIMÉTIERS, NÉGOCES GÉNÉRALISTES OU SPÉCIALISTES (Greg, 25 octobre 2026). Du code pur, zéro IA :
 *
 * 1. L'artisan ne choisit jamais de catégorie : chaque ligne est rangée dans sa famille (`familleDeLaLigne`).
 * 2. Le négoce est « Généraliste : je chiffre toute la liste » ou « Spécialiste : je chiffre seulement mes familles » ; un
 *    spécialiste ne reçoit que ses lignes (`lignesDuNegoce`), et rien du tout si le cycle n'en a aucune (`concerne`).
 * 3. Pour chaque artisan, les meilleures combinaisons livraison comprise (`combinaisonsDeLArtisan`) : famille par famille,
 *    et « Tout chez X » pour chaque négoce qui a tout chiffré ; la moins chère d'abord, avec l'écart et le nombre de livraisons.
 * 4. Aucun négoce ne voit les prix des autres ni la nature de ses concurrents : son rang ne se calcule que sur ses propres
 *    lignes (`rangSurSonPerimetre`).
 */

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

/** Libellés courts des familles, pour une combinaison qui tient sur une ligne (« Couverture chez X, second œuvre chez Y »). */
export const LIBELLES_COURTS_FAMILLES: Readonly<Record<FamilleGroupe, string>> = {
  couverture: "couverture",
  charpente: "charpente",
  maconnerie: "maçonnerie",
  electricite: "électricité",
  plomberie: "plomberie",
  amenagement_exterieur: "aménagement extérieur",
  menuiseries_fermetures: "menuiseries",
  second_oeuvre: "second œuvre",
  serrurerie_metallerie: "serrurerie",
};

/**
 * Les mots du comptoir qui rangent une ligne dans sa famille. L'ordre compte : la première famille qui reconnaît la ligne
 * l'emporte (« Mortier pour solin » est de la couverture, « Tube PVC de descente » aussi).
 */
const MOTS_DES_FAMILLES: readonly [FamilleGroupe, RegExp][] = [
  ["couverture", /\b(tuiles?|ardoises?|faitieres?|faitage|zinc|gouttieres?|descentes?|naissances?|liteaux?|voliges?|ecran sous toiture|closoirs?|bac acier|cheneaux?|noues?|solins?|abergements?|fenetres? de toit|velux|chatieres?|rives?|egouts?|couvertines?|crochets? de gouttiere)\b/],
  ["plomberie", /\b(tubes? (per|multicouche|cuivre)|raccords?|robinets?|vannes?|wc|lavabos?|eviers?|siphons?|chauffe eau|ballons?|mitigeurs?|douches?|baignoires?|evacuation)\b/],
  ["electricite", /\b(cables?|gaines?|disjoncteurs?|interrupteurs?|prises?|tableaux? electriques?|boites? d encastrement|dcl|spots?|luminaires?|interrupteurs? differentiels?)\b/],
  ["second_oeuvre", /\b(placo|placoplatre|plaques? de platre|ba ?13|ba ?18|rails?|montants?|fourrures?|bandes? a joints?|enduits? de lissage|peintures?|carrelage|carreaux|faience|colle a carrelage|parquets?|plinthes?|dalles? de plafond)\b/],
  ["charpente", /\b(chevrons?|pannes?|solives?|madriers?|bastaings?|lambourdes?|poutres?|sabots?|connecteurs? bois)\b/],
  ["maconnerie", /\b(parpaings?|ciments?|betons?|sables?|graviers?|mortiers?|agglos?|briques?|linteaux?|treillis|fers? a beton)\b/],
  ["menuiseries_fermetures", /\b(portes?|fenetres?|volets?|portails?)\b/],
];

/**
 * La famille d'une ligne : celle de son lot quand la lecture en a rendu plusieurs (le modèle a nommé le métier de la
 * ligne), sinon celle que ses mots désignent, sinon celle du métier de la liste.
 */
export function familleDeLaLigne(designation: string, o: { familleDuLot?: string | null; defaut: string }): string {
  if (o.familleDuLot) return o.familleDuLot;
  const texte = ` ${normalizeText(designation).replace(/[^a-z0-9]+/g, " ")} `;
  return MOTS_DES_FAMILLES.find(([, mots]) => mots.test(texte))?.[0] ?? o.defaut;
}

/** Ce qu'un négoce chiffre : toute la liste (généraliste), ou ses familles cochées (spécialiste). */
export interface ProfilNegoce {
  negoceId: string;
  generaliste: boolean;
  familles: readonly string[];
}

/** Une ligne sans famille (commande d'avant le multimétier) prend celle du cycle. */
const familleDe = (l: LigneDeGrille, familleDuCycle: string | null) => l.famille ?? familleDuCycle ?? "";

export function chiffreLaFamille(p: Pick<ProfilNegoce, "generaliste" | "familles">, famille: string): boolean {
  return p.generaliste || p.familles.includes(famille);
}

/** Les lignes que ce négoce reçoit : toutes pour un généraliste, seulement les siennes pour un spécialiste. */
export function lignesDuNegoce(lignes: readonly LigneDeGrille[], p: Pick<ProfilNegoce, "generaliste" | "familles">, familleDuCycle: string | null = null): LigneDeGrille[] {
  return lignes.filter((l) => chiffreLaFamille(p, familleDe(l, familleDuCycle)));
}

/** Un spécialiste sans aucune ligne de ses familles dans le cycle ne reçoit rien : ni grille, ni e-mail, ni relance. */
export function concerne(lignes: readonly LigneDeGrille[], p: Pick<ProfilNegoce, "generaliste" | "familles">, familleDuCycle: string | null = null): boolean {
  return lignesDuNegoce(lignes, p, familleDuCycle).length > 0;
}

export interface PartDeCombinaison {
  negoceId: string;
  familles: string[];
  /** Les clés des lignes de l'artisan qui partent chez ce négoce (son bon de commande ne porte qu'elles). */
  cles: string[];
  marchandiseHt: number;
  livraisonHt: number;
  totalHt: number;
  /** Les lignes au prix « non garanti » : indicatives, hors total. */
  indicatives: { cle: string; prixUnitaire: number }[];
}

export interface Combinaison {
  /** Identifie la combinaison (« couverture=<négoce>;second_oeuvre=<négoce> ») : l'artisan commande celle-là, le serveur la recalcule. */
  cle: string;
  parts: PartDeCombinaison[];
  totalHt: number;
  /** Une livraison par négoce et par chantier. */
  livraisons: number;
  /** L'écart avec la moins chère (0 pour elle). */
  ecartHt: number;
  /** « Tout chez X » : un seul négoce pour toute la liste. */
  toutChez: string | null;
}

export interface CombinaisonsDeLArtisan {
  combinaisons: Combinaison[];
  /** Les familles de l'artisan qu'aucun négoce n'a entièrement chiffrées (ou ne livre pas) : hors de toute combinaison. */
  sansPrix: string[];
}

/** Au-delà, les négoces de chaque famille sont réduits aux moins chers sur la marchandise (le calcul reste instantané). */
const COMBINAISONS_MAX = 5000;

/**
 * LES MEILLEURES COMBINAISONS D'UN ARTISAN, livraison comprise : pour chaque famille de sa liste, les négoces qui en
 * chiffrent toutes ses lignes et livrent tous ses chantiers ; chaque répartition famille → négoce est évaluée (marchandise,
 * plus une livraison par négoce retenu et par chantier, aux paliers de ce négoce et à ses distances). Les `max` moins
 * chères, la moins chère d'abord (à égalité : moins de livraisons, puis l'ordre de dépôt) ; une « Tout chez X » figure
 * toujours parmi elles quand un négoce a tout chiffré.
 */
export function combinaisonsDeLArtisan(commande: CommandeDArtisan, grilles: readonly GrilleChiffree[], o: { familleDuCycle?: string | null; max?: number } = {}): CombinaisonsDeLArtisan {
  const max = o.max ?? 3;
  const familleDuCycle = o.familleDuCycle ?? null;
  const familles = [...new Set(commande.lignes.map((l) => familleDe(l, familleDuCycle)))];
  const ordre = new Map(grilles.map((g, i) => [g.negoceId, i]));
  const fraisParNegoce = new Map<string, number | null>();
  for (const g of grilles) {
    const distances = commande.distances[g.negoceId] ?? Array.from({ length: commande.chantiers }, () => null);
    const frais = distances.map((d) => fraisDeLivraisonPaliers(d, g.livraison));
    fraisParNegoce.set(g.negoceId, frais.every((f) => f !== null) ? arrondi2(frais.reduce<number>((s, f) => s + (f ?? 0), 0)) : null);
  }
  // Par famille : chaque négoce qui chiffre toutes ses lignes et livre l'artisan, avec sa marchandise.
  const candidats = new Map<string, { g: GrilleChiffree; marchandise: number; cles: string[]; indicatives: { cle: string; prixUnitaire: number }[] }[]>();
  const sansPrix: string[] = [];
  for (const f of familles) {
    const lignes = commande.lignes.filter((l) => familleDe(l, familleDuCycle) === f);
    const liste = [];
    for (const g of grilles) {
      if (fraisParNegoce.get(g.negoceId) === null) continue;
      if (!lignes.every((l) => g.prix[l.cle] !== undefined && g.prix[l.cle]! >= 0)) continue;
      const nonGarantis = new Set(g.nonGarantis ?? []);
      const indicatives = lignes.filter((l) => nonGarantis.has(l.cle)).map((l) => ({ cle: l.cle, prixUnitaire: g.prix[l.cle]! }));
      const marchandise = lignes.filter((l) => !nonGarantis.has(l.cle)).reduce((s, l) => s + l.quantite * g.prix[l.cle]!, 0);
      liste.push({ g, marchandise, cles: lignes.map((l) => l.cle), indicatives });
    }
    if (liste.length === 0) sansPrix.push(f);
    else candidats.set(f, liste.sort((a, b) => a.marchandise - b.marchandise || ordre.get(a.g.negoceId)! - ordre.get(b.g.negoceId)!));
  }
  const avecPrix = familles.filter((f) => candidats.has(f));
  if (avecPrix.length === 0) return { combinaisons: [], sansPrix };
  let parFamille = avecPrix.map((f) => candidats.get(f)!);
  for (let garde = 8; parFamille.reduce((n, c) => n * c.length, 1) > COMBINAISONS_MAX && garde > 1; garde--) parFamille = parFamille.map((c) => c.slice(0, garde));

  const toutes: Combinaison[] = [];
  const parcourir = (i: number, choix: (typeof parFamille)[number][number][]) => {
    if (i === avecPrix.length) {
      const parNegoce = new Map<string, PartDeCombinaison>();
      avecPrix.forEach((f, k) => {
        const c = choix[k]!;
        const part = parNegoce.get(c.g.negoceId) ?? { negoceId: c.g.negoceId, familles: [], cles: [], marchandiseHt: 0, livraisonHt: fraisParNegoce.get(c.g.negoceId)!, totalHt: 0, indicatives: [] };
        part.familles.push(f);
        part.cles.push(...c.cles);
        part.marchandiseHt += c.marchandise;
        part.indicatives.push(...c.indicatives);
        parNegoce.set(c.g.negoceId, part);
      });
      const parts = [...parNegoce.values()]
        .map((p) => ({ ...p, marchandiseHt: arrondi2(p.marchandiseHt), totalHt: arrondi2(p.marchandiseHt + p.livraisonHt) }))
        // Dans l'ordre des familles de la liste : « Couverture chez X, second œuvre chez Y ».
        .sort((a, b) => avecPrix.indexOf(a.familles[0]!) - avecPrix.indexOf(b.familles[0]!));
      const totalHt = arrondi2(parts.reduce((s, p) => s + p.totalHt, 0));
      toutes.push({ cle: avecPrix.map((f, k) => `${f}=${choix[k]!.g.negoceId}`).join(";"), parts, totalHt, livraisons: parts.length * commande.chantiers, ecartHt: 0, toutChez: parts.length === 1 && sansPrix.length === 0 ? parts[0]!.negoceId : null });
      return;
    }
    for (const c of parFamille[i]!) parcourir(i + 1, [...choix, c]);
  };
  parcourir(0, []);
  const premierOrdre = (c: Combinaison) => Math.min(...c.parts.map((p) => ordre.get(p.negoceId)!));
  toutes.sort((a, b) => a.totalHt - b.totalHt || a.livraisons - b.livraisons || premierOrdre(a) - premierOrdre(b));
  const retenues = toutes.slice(0, max);
  const toutChez = toutes.find((c) => c.toutChez);
  if (toutChez && !retenues.some((c) => c.toutChez)) retenues.splice(max - 1, 1, toutChez);
  const meilleur = retenues[0]!.totalHt;
  return { combinaisons: retenues.map((c) => ({ ...c, ecartHt: arrondi2(c.totalHt - meilleur) })), sansPrix };
}

/** « Tout chez X » ou « Couverture chez X, second œuvre chez Y » : la combinaison en une ligne. */
export function libelleDeCombinaison(c: { parts: readonly { negoceId: string; familles: readonly string[] }[]; toutChez: string | null }, nomDe: (negoceId: string) => string): string {
  if (c.toutChez) return `Tout chez ${nomDe(c.toutChez)}`;
  const texte = c.parts.map((p) => `${p.familles.map((f) => LIBELLES_COURTS_FAMILLES[f as FamilleGroupe] ?? f).join(" et ")} chez ${nomDe(p.negoceId)}`).join(", ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « 1 livraison », « 2 livraisons ». */
export const phraseDeLivraisons = (n: number) => `${n} livraison${n > 1 ? "s" : ""}`;

/**
 * Le rang d'un négoce SUR SON PÉRIMÈTRE (ses lignes à lui) : son total, livraisons comprises, comparé à celui de chaque
 * autre grille qui chiffre aussi toutes ces lignes. Premier s'il a tout chiffré de son périmètre et que personne ne fait
 * moins cher dessus. Rien ne trahit la présence d'un spécialiste ou d'un généraliste en face.
 */
export function rangSurSonPerimetre(
  g: GrilleChiffree,
  profil: Pick<ProfilNegoce, "generaliste" | "familles">,
  grilles: readonly GrilleChiffree[],
  lignes: readonly LigneDeGrille[],
  commandes: readonly CommandeDArtisan[],
  familleDuCycle: string | null = null,
): number {
  const perimetre = lignesDuNegoce(lignes, profil, familleDuCycle);
  const cles = new Set(perimetre.map((l) => l.cle));
  const total = (x: GrilleChiffree): number | null => {
    if (!perimetre.every((l) => x.prix[l.cle] !== undefined)) return null;
    let s = 0;
    for (const c of commandes) {
      const siennes = c.lignes.filter((l) => cles.has(l.cle));
      if (siennes.length === 0) continue;
      const nonGarantis = new Set(x.nonGarantis ?? []);
      s += siennes.filter((l) => !nonGarantis.has(l.cle)).reduce((t, l) => t + l.quantite * x.prix[l.cle]!, 0);
      const distances = c.distances[x.negoceId] ?? Array.from({ length: c.chantiers }, () => null);
      for (const d of distances) {
        const f = fraisDeLivraisonPaliers(d, x.livraison);
        if (f === null) return null;
        s += f;
      }
    }
    return arrondi2(s);
  };
  const moi = total(g);
  if (moi === null) return 2;
  const ordre = grilles.indexOf(g);
  const devant = grilles.filter((x, i) => x !== g && (() => {
    const t = total(x);
    return t !== null && (t < moi || (t === moi && i < ordre));
  })()).length;
  return devant + 1;
}

/** Les familles connues, dans l'ordre du formulaire du négoce. */
export const FAMILLES_A_COCHER: readonly FamilleGroupe[] = FAMILLES_GROUPE;
