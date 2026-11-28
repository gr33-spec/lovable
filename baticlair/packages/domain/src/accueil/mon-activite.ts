/**
 * L'ACCUEIL PREMIUM (Greg, 20 novembre 2026 : « un écran magnifique, premium, évident ») : trois zones, « Nouveau
 * quantitatif », « Mon activité », « Achats groupés ». Ce module ne fait que trier et nommer ce que l'API dit déjà : aucune
 * donnée inventée, aucun chiffre deviné. Il ne connaît ni l'écran ni le réseau. « Mon activité » (`monActivite`) est dans `accueil.ts`, à côté de la règle de priorité.
 */

/** Ce que l'API dit d'un achat groupé (`AchatV1.resume`) : la règle des 3 est déjà tenue par le serveur. */
export interface ResumeGroupe {
  entreprises: number;
  volume: string | null;
  regroupement?: boolean;
}

/** Sous ce nombre d'entreprises, un achat groupé ne dit ni son volume ni son nombre de participants (Greg, 16 novembre 2026). */
export const SEUIL_VOLUME_GROUPE = 3;

/**
 * LA RÈGLE DES 3 (Greg, 16 novembre 2026) : sous 3 entreprises, « En cours de regroupement », jamais le volume ni le
 * nombre ; à partir de 3, le nombre et le TOTAL seulement, jamais la quantité de chacun. Le code redit la règle même si
 * l'API, un jour, envoyait un volume trop tôt.
 */
export function phraseGroupe(r: ResumeGroupe | null | undefined): string {
  if (!r || r.entreprises < SEUIL_VOLUME_GROUPE || !r.volume) return "En cours de regroupement";
  return `${r.entreprises} entreprises · ${r.volume} au total`;
}

/** Le chrono ne s'affiche qu'à moins de 48 h de la clôture. */
export const CHRONO_MS = 48 * 3600 * 1000;

/**
 * LE CHRONO D'UN ACHAT GROUPÉ : calculé sur la VRAIE date de clôture, à chaque seconde, jamais remis à zéro. Plus de 48 h :
 * null (pas de chrono). À zéro ou après : `clos`. Sinon « 23:14:05 » (heures, minutes, secondes).
 */
export function compteARebours(clotureIso: string, maintenant: number): { clos: boolean; texte: string } | null {
  const fin = Date.parse(clotureIso);
  if (!Number.isFinite(fin)) return null;
  const reste = fin - maintenant;
  if (reste <= 0) return { clos: true, texte: "00:00:00" };
  if (reste > CHRONO_MS) return null;
  const s = Math.floor(reste / 1000);
  const deux = (n: number) => String(n).padStart(2, "0");
  return { clos: false, texte: `${deux(Math.floor(s / 3600))}:${deux(Math.floor((s % 3600) / 60))}:${deux(s % 60)}` };
}

/** Les artisans d'un métier, au pluriel (« Rejoins les couvreurs… ») ; un métier sans mot juste dit « artisans ». */
export const ARTISANS_DU_METIER: Readonly<Record<string, string>> = {
  roofing: "couvreurs",
  painting: "peintres",
  electrical: "électriciens",
  plumbing: "plombiers",
  carpentry: "charpentiers",
  masonry: "maçons",
  joinery: "menuisiers",
  interior_joinery: "menuisiers",
  drywall: "plaquistes",
  tiling: "carreleurs",
  flooring: "poseurs de sols",
  waterproofing: "étancheurs",
  hvac: "chauffagistes",
  facade: "façadiers",
  metalwork: "métalliers",
  solar: "installateurs solaires",
  kitchen: "cuisinistes",
  paving: "paveurs",
  earthworks: "terrassiers",
};
export const artisansDuMetier = (metiers: readonly string[]): string => (metiers.length === 1 ? (ARTISANS_DU_METIER[metiers[0]!] ?? "artisans") : "artisans");

/**
 * « des Côtes-d'Armor », « du Finistère », « de l'Ille-et-Vilaine », « de la Manche » : l'article juste de chaque
 * département (grammaire seule ; le nom vient de la table des départements). s = des, u = du, l = de l', a = de la,
 * absent = de (Paris, Mayotte, La Réunion).
 */
const ARTICLE: Readonly<Record<string, "s" | "u" | "l" | "a">> = {
  "01": "l", "02": "l", "03": "l", "04": "s", "05": "s", "06": "s", "07": "l", "08": "s", "09": "l", "10": "l", "11": "l", "12": "l", "13": "s", "14": "u", "15": "u", "16": "a", "17": "a", "18": "u", "19": "a", "2A": "a", "2B": "a",
  "21": "a", "22": "s", "23": "a", "24": "a", "25": "u", "26": "a", "27": "l", "28": "l", "29": "u", "30": "u", "31": "a", "32": "u", "33": "a", "34": "l", "35": "l", "36": "l", "37": "l", "38": "l", "39": "u", "40": "s",
  "41": "u", "42": "a", "43": "a", "44": "a", "45": "u", "46": "u", "47": "u", "48": "a", "49": "u", "50": "a", "51": "a", "52": "a", "53": "a", "54": "a", "55": "a", "56": "u", "57": "a", "58": "a", "59": "u", "60": "l",
  "61": "l", "62": "u", "63": "u", "64": "s", "65": "s", "66": "s", "67": "u", "68": "u", "69": "u", "70": "a", "71": "a", "72": "a", "73": "a", "74": "a", "76": "a", "77": "a", "78": "s", "79": "s", "80": "a",
  "81": "u", "82": "u", "83": "u", "84": "u", "85": "a", "86": "a", "87": "a", "88": "s", "89": "l", "90": "u", "91": "l", "92": "s", "93": "a", "94": "u", "95": "u", "971": "a", "972": "a", "973": "a",
};
const PREFIXE = { s: "des ", u: "du ", l: "de l'", a: "de la " } as const;
export function deDepartement(code: string, nom: string): string {
  const a = ARTICLE[code.toUpperCase()];
  if (!a) return `de ${nom}`;
  // « Côtes-d'Armor » commence au pluriel : « les Côtes » → « des Côtes » ; le nom garde sa capitale.
  return `${PREFIXE[a]}${nom}`;
}

/**
 * L'ACCOMPAGNEMENT D'UN NOUVEAU COMPTE : trois étapes qui se cochent d'après les VRAIS dossiers de l'entreprise (une liste
 * créée, une demande partie, un achat groupé découvert ou rejoint). Il ne s'affiche qu'à un compte qui commence (aucune
 * liste à sa première visite, ou déjà commencé sur cet appareil), jamais une fois fermé ni une fois tout coché.
 */
export interface EtapeAccompagnement {
  id: "quantitatif" | "prix" | "groupes";
  titre: string;
  faite: boolean;
  href: string;
}
export function accompagnement(x: { listes: number; demandes: number; groupesVus: boolean; besoinsGroupes: number }): EtapeAccompagnement[] {
  return [
    { id: "quantitatif", titre: "Faire mon premier quantitatif", faite: x.listes > 0, href: "/chantiers/nouveau" },
    { id: "prix", titre: "Demander mes premiers prix", faite: x.demandes > 0, href: x.listes > 0 ? "/demandes" : "/chantiers/nouveau" },
    { id: "groupes", titre: "Découvrir les achats groupés", faite: x.groupesVus || x.besoinsGroupes > 0, href: "/achats-groupes" },
  ];
}
