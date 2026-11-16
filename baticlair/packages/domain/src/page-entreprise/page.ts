import { paletteDeLaPage, type Palette } from "./couleurs.js";
import { themeDuMetier, type Fond, type Picto, type ThemeMetier, type Visuel } from "./themes.js";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : ce qui se décide sans base ni écran. L'adresse de la page, les trois modèles,
 * les rubriques qui s'affichent (JAMAIS une rubrique vide), les données structurées pour Google (LocalBusiness), et ce que
 * « Mobiiz m'aide à l'écrire » propose quand l'IA ne répond pas (le code seul, à partir du profil).
 */

/* ------------------------------------------------------------------------------------------------------------ Modèles */

/** Trois architectures vraiment différentes (pas trois couleurs) : l'ordre et la forme des rubriques changent. */
export const MODELES_PAGE = [
  { id: "photo", nom: "Plein écran photo", phrase: "Une grande photo de chantier en ouverture, puis vos réalisations." },
  { id: "colonnes", nom: "Classique en colonnes", phrase: "Une fiche claire : vos infos à gauche, vos réalisations à droite." },
  { id: "sobre", nom: "Sobre et direct", phrase: "L'essentiel d'abord : qui vous êtes, où, et le bouton pour appeler." },
] as const;
export type ModelePage = (typeof MODELES_PAGE)[number]["id"];
export const MODELE_PAR_DEFAUT: ModelePage = "photo";
export function estModele(v: unknown): v is ModelePage {
  return MODELES_PAGE.some((m) => m.id === v);
}

/* ------------------------------------------------------------------------------------------------------------ Adresse */

/** `mobiiz.fr/e/<adresse>` : 3 à 50 caractères, minuscules, chiffres et tirets. */
export const ADRESSE_MIN = 3;
export const ADRESSE_MAX = 50;
const MOTS_RESERVES = new Set(["admin", "api", "v1", "mobiiz", "aide", "nouveau", "nouvelle", "compte", "connexion", "inscription", "page", "pages", "e", "test", "contact", "support", "negoce", "negoces", "missions", "www"]);

/** « Toits Martin & Fils (SARL) » → « toits-martin-fils-sarl ». */
export function adresseDepuis(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ADRESSE_MAX)
    .replace(/-+$/g, "");
}

/** La raison d'un refus d'adresse (une phrase pour l'artisan), ou null si elle est valable. */
export function refusAdresse(adresse: string): string | null {
  if (adresse.length < ADRESSE_MIN) return `Au moins ${ADRESSE_MIN} caractères.`;
  if (adresse.length > ADRESSE_MAX) return `${ADRESSE_MAX} caractères au plus.`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(adresse)) return "Seulement des lettres sans accent, des chiffres et des tirets.";
  if (MOTS_RESERVES.has(adresse)) return "Cette adresse est réservée.";
  return null;
}

/** Les adresses à essayer dans l'ordre pour une entreprise : son nom, son nom et sa ville, puis numérotées. */
export function adressesCandidates(nom: string, ville: string | null | undefined): string[] {
  const base = adresseDepuis(nom);
  const sure = refusAdresse(base) ? `entreprise-${base}`.replace(/-$/, "").slice(0, ADRESSE_MAX) : base;
  const avecVille = ville ? adresseDepuis(`${nom} ${ville}`) : null;
  const liste = [sure, ...(avecVille && avecVille !== sure && !refusAdresse(avecVille) ? [avecVille] : [])];
  for (let i = 2; i <= 99; i++) liste.push(`${sure.slice(0, ADRESSE_MAX - 3)}-${i}`);
  return liste.filter((a) => !refusAdresse(a));
}

/* ------------------------------------------------------------------------------------------------------------ Contenu */

/** Les certifications et assurances les plus déclarées (pastilles à toucher) ; l'artisan peut en écrire d'autres. */
export const CERTIFICATIONS_SUGGEREES = ["Assurance décennale", "Responsabilité civile pro", "RGE", "Qualibat", "Qualifelec", "QualiPV", "QualiPAC", "Qualigaz", "Artisan certifié CMA", "Garantie de parfait achèvement"] as const;

export const LIMITES_PAGE = {
  accroche: 90,
  presentation: 900,
  zone: 120,
  horaires: 200,
  telephone: 25,
  siteWeb: 200,
  certification: 60,
  certifications: 10,
  legende: 120,
  photos: 20,
  creeeEn: { min: 1900 },
} as const;

/** Une photo prête : ses variantes (largeur → adresses AVIF et WebP), dans l'ordre de la galerie. */
export interface PhotoPublique {
  id: string;
  legende: string | null;
  largeur: number;
  hauteur: number;
  variantes: { largeur: number; avif: string; webp: string }[];
  /** Version JPEG 1200 px, pour l'image d'aperçu des réseaux (WhatsApp, Facebook). */
  partage: string | null;
}

/** Ce que la page publique reçoit de l'API : tout est déjà filtré (rien de personnel sans le choix de l'artisan). */
export interface ContenuPage {
  adresse: string;
  nom: string;
  metierPrincipal: string;
  metiers: string[];
  accroche: string | null;
  presentation: string | null;
  zone: string | null;
  horaires: string | null;
  telephone: string | null;
  siteWeb: string | null;
  /** L'adresse postale : seulement si l'artisan a coché « Afficher mon adresse ». */
  adressePostale: string | null;
  creeeEn: number | null;
  certifications: string[];
  verifiee: boolean;
  modele: ModelePage;
  couleur: string | null;
  fond: Fond | null;
  pictos: boolean;
  motif: boolean;
  logo: string | null;
  couverture: PhotoPublique | null;
  photos: PhotoPublique[];
  /** Missions ouvertes (réglage MISSIONS_V1) : la disponibilité publiée, sinon null ; absent quand Missions est coupé. */
  missions: { disponibleDu: string | null; disponibleAu: string | null; lien: string } | null;
  majLe: string;
}

export interface Ambiance {
  theme: ThemeMetier;
  palette: Palette;
  visuel: Visuel;
  picto: Picto;
}

/** L'ambiance de la page : le thème du métier principal, sauf ce que l'artisan a choisi lui-même (couleur, fond). */
export function ambianceDe(c: Pick<ContenuPage, "metierPrincipal" | "couleur" | "fond">): Ambiance {
  const theme = themeDuMetier(c.metierPrincipal);
  const fond = c.fond ?? theme.fond;
  return { theme, palette: paletteDeLaPage(c.couleur, fond, theme.couleur), visuel: theme.visuel, picto: theme.picto };
}

/** Le sous-titre : l'accroche de l'artisan, sinon « Couvreur à Lannion » (jamais un texte inventé sur la page). */
export function sousTitre(c: Pick<ContenuPage, "accroche" | "metierPrincipal" | "zone">): string {
  if (c.accroche?.trim()) return c.accroche.trim();
  const theme = themeDuMetier(c.metierPrincipal);
  return c.zone?.trim() ? `${theme.nom} · ${c.zone.trim()}` : theme.nom;
}

export const RUBRIQUES = ["presentation", "metiers", "zone", "galerie", "preuves", "horaires", "missions", "contact"] as const;
export type Rubrique = (typeof RUBRIQUES)[number];

/** Les rubriques qui ont un contenu : une rubrique vide n'apparaît JAMAIS. Le contact (formulaire) est toujours là. */
export function rubriquesVisibles(c: ContenuPage): Rubrique[] {
  const r: Rubrique[] = [];
  if (c.presentation?.trim()) r.push("presentation");
  if (c.metiers.length > 0) r.push("metiers");
  if (c.zone?.trim() || c.adressePostale?.trim()) r.push("zone");
  if (c.photos.length > 0) r.push("galerie");
  if (c.verifiee || c.certifications.length > 0 || c.creeeEn) r.push("preuves");
  if (c.horaires?.trim()) r.push("horaires");
  if (c.missions) r.push("missions");
  r.push("contact");
  return r;
}

/** L'ordre des rubriques selon le modèle : la même structure, trois architectures. */
export function ordreDesRubriques(modele: ModelePage, visibles: readonly Rubrique[]): Rubrique[] {
  const ordre: Record<ModelePage, Rubrique[]> = {
    photo: ["preuves", "galerie", "presentation", "metiers", "zone", "horaires", "missions", "contact"],
    colonnes: ["presentation", "metiers", "preuves", "zone", "horaires", "galerie", "missions", "contact"],
    sobre: ["metiers", "zone", "preuves", "presentation", "horaires", "galerie", "missions", "contact"],
  };
  return ordre[modele].filter((x) => visibles.includes(x));
}

/** Le type schema.org le plus précis connu pour le métier (sinon LocalBusiness du bâtiment). */
const TYPES_SCHEMA: Record<string, string> = {
  roofing: "RoofingContractor",
  painting: "HousePainter",
  electrical: "Electrician",
  plumbing: "Plumber",
  hvac: "HVACBusiness",
  general: "GeneralContractor",
};

/** Le titre de l'onglet et de Google : « Couvreur à Lannion – Toits Martin ». */
export function titreDeLaPage(c: Pick<ContenuPage, "nom" | "metierPrincipal" | "zone">): string {
  const theme = themeDuMetier(c.metierPrincipal);
  return `${theme.nom}${c.zone?.trim() ? ` à ${c.zone.trim()}` : ""} – ${c.nom}`;
}

/** La description pour Google et les réseaux : l'accroche ou la présentation, coupée proprement à 160 caractères. */
export function descriptionDeLaPage(c: Pick<ContenuPage, "nom" | "metierPrincipal" | "zone" | "accroche" | "presentation" | "metiers">, libelles: Record<string, string>): string {
  const theme = themeDuMetier(c.metierPrincipal);
  const base = [c.accroche?.trim(), c.presentation?.trim()].filter(Boolean).join(". ") || `${c.nom}, ${theme.nom.toLowerCase()}${c.zone ? ` à ${c.zone}` : ""}. ${c.metiers.map((m) => libelles[m] ?? m).join(", ")}.`;
  const plat = base.replace(/\s+/g, " ").trim();
  if (plat.length <= 160) return plat;
  const coupe = plat.slice(0, 157);
  return `${coupe.slice(0, Math.max(coupe.lastIndexOf(" "), 120))}…`;
}

/** Les données structurées (JSON-LD) : jamais d'adresse exacte sans le choix de l'artisan, jamais de note inventée. */
export function donneesStructurees(c: ContenuPage, url: string, libelles: Record<string, string>): Record<string, unknown> {
  const d: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": TYPES_SCHEMA[c.metierPrincipal] ?? "HomeAndConstructionBusiness",
    name: c.nom,
    url,
    description: descriptionDeLaPage(c, libelles),
  };
  if (c.telephone) d.telephone = c.telephone;
  if (c.zone) d.areaServed = c.zone;
  if (c.adressePostale) d.address = { "@type": "PostalAddress", streetAddress: c.adressePostale, addressCountry: "FR" };
  if (c.logo) d.logo = c.logo;
  const image = c.couverture?.partage ?? c.photos[0]?.partage ?? null;
  if (image) d.image = image;
  if (c.siteWeb) d.sameAs = [c.siteWeb];
  if (c.creeeEn) d.foundingDate = String(c.creeeEn);
  if (c.metiers.length) d.knowsAbout = c.metiers.map((m) => libelles[m] ?? m);
  if (c.horaires) d.openingHours = c.horaires;
  return d;
}

/* -------------------------------------------------------------------------------------------- Textes et coordonnées */

/** Un lien de site web propre (https ajouté s'il manque), ou null s'il n'en est pas un. */
export function siteWebPropre(v: string | null | undefined): string | null {
  const brut = v?.trim();
  if (!brut) return null;
  const avec = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
  try {
    const u = new URL(avec);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || u.username || u.password) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Un numéro de téléphone français ou international lisible, ou null. Garde le « + », retire le reste. */
export function telephonePropre(v: string | null | undefined): string | null {
  const brut = v?.trim();
  if (!brut) return null;
  const chiffres = brut.replace(/[^\d+]/g, "");
  if (!/^\+?\d{9,15}$/.test(chiffres)) return null;
  if (/^0\d{9}$/.test(chiffres)) return chiffres.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return chiffres;
}

/** Le lien d'appel (`tel:`) : chiffres et « + » seulement. */
export function lienAppel(tel: string): string {
  return `tel:${tel.replace(/[^\d+]/g, "")}`;
}

const MOTIF_EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi;
const MOTIF_TEL = /(?:\+|00)?\d(?:[\s.-]?\d){8,}/g;
const MOTIF_URL = /\b(?:https?:\/\/|www\.)\S+/gi;

/**
 * Un texte proposé par l'IA : jamais un e-mail, un numéro ni un lien qu'elle aurait écrits (ils ne viennent que des
 * champs de l'artisan), jamais plus long que la limite, espaces propres.
 */
export function texteSur(v: string | null | undefined, max: number): string {
  return (v ?? "")
    .replace(MOTIF_EMAIL, "")
    .replace(MOTIF_URL, "")
    .replace(MOTIF_TEL, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max)
    .trim();
}

export interface ProfilPourEcrire {
  nom: string;
  metiers: string[];
  zone: string | null;
  creeeEn: number | null;
  certifications: string[];
  verifiee: boolean;
}

/** Ce que Mobiiz propose sans IA (IA coupée, en panne ou plus d'analyses) : des phrases tirées du seul profil. */
export function proposerTextes(p: ProfilPourEcrire, libelles: Record<string, string>): { accroche: string; presentation: string } {
  const theme = themeDuMetier(p.metiers[0]);
  const accroche = texteSur(`${theme.accroche.replace("{zone}", p.zone ? ` à ${p.zone}` : "")}`, LIMITES_PAGE.accroche);
  const metiers = p.metiers.map((m) => (libelles[m] ?? m).toLowerCase());
  const phrases = [
    `${p.nom} intervient en ${metiers.length ? metiers.join(", ") : theme.nom.toLowerCase()}${p.zone ? ` à ${p.zone} et alentours` : ""}.`,
    theme.presentation,
    p.creeeEn ? `Entreprise créée en ${p.creeeEn}.` : null,
    p.certifications.length ? `${p.certifications.join(", ")}.` : null,
    "Appelez-nous ou écrivez-nous : nous vous répondons rapidement avec un devis clair.",
  ];
  return { accroche, presentation: texteSur(phrases.filter(Boolean).join(" "), LIMITES_PAGE.presentation) };
}

/** Les consignes de l'IA pour « Mobiiz m'aide à l'écrire » (texte seul, jamais un document ni un nom de client). */
export const ECRITURE_PAGE_PROMPT = { id: "ecriture_page_entreprise", version: 1 } as const;
export const ECRITURE_PAGE_SYSTEM = [
  "Tu écris pour la page publique d'une entreprise artisanale du bâtiment, en français, au vouvoiement, pour ses futurs clients.",
  "Tu rends deux textes : une ACCROCHE (une phrase, 90 caractères au plus, concrète, sans point d'exclamation) et une PRÉSENTATION (3 à 5 phrases, 600 caractères au plus).",
  "Tu n'utilises QUE les faits donnés (nom, métiers, zone, année, certifications). Tu n'inventes jamais un chiffre, une année, un nombre d'avis, une garantie, un label, une note, un nom de personne, un téléphone, un e-mail ni un site.",
  "Pas de superlatif creux (« le meilleur », « n°1 »), pas d'emoji, pas de majuscules d'insistance. Ton simple, chaleureux et professionnel.",
].join("\n");

export function dossierEcriture(p: ProfilPourEcrire, libelles: Record<string, string>, brouillon: { accroche: string | null; presentation: string | null }): string {
  return [
    `Nom : ${p.nom}`,
    `Métiers : ${p.metiers.map((m) => libelles[m] ?? m).join(", ") || "non précisés"}`,
    `Zone : ${p.zone ?? "non précisée"}`,
    p.creeeEn ? `Créée en : ${p.creeeEn}` : null,
    p.certifications.length ? `Certifications et assurances déclarées : ${p.certifications.join(", ")}` : null,
    p.verifiee ? "SIRET vérifié" : null,
    brouillon.accroche ? `Accroche actuelle (à améliorer) : ${brouillon.accroche}` : null,
    brouillon.presentation ? `Présentation actuelle (à améliorer) : ${brouillon.presentation}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export type { Fond, Picto, Visuel, ThemeMetier, Palette };
