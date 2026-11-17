import { teinteDeLaPage, themeDuMetier, type Prestation, type ThemeMetier } from "./themes.js";

/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : ce qui se décide sans base ni écran. L'adresse de la page, les trois modèles,
 * les rubriques qui s'affichent (JAMAIS une rubrique vide), les données structurées pour Google (LocalBusiness), et ce que
 * « Mobiiz m'aide à l'écrire » propose quand l'IA ne répond pas (le code seul, à partir du profil).
 */

/* ------------------------------------------------------------------------------------------------------------ Adresse */

/** `mobiiz.fr/e/<adresse>` : 3 à 50 caractères, minuscules, chiffres et tirets. */
export const ADRESSE_PAGE_MIN = 3;
export const ADRESSE_PAGE_MAX = 50;
const MOTS_RESERVES = new Set(["admin", "api", "v1", "mobiiz", "aide", "nouveau", "nouvelle", "compte", "connexion", "inscription", "page", "pages", "e", "test", "contact", "support", "negoce", "negoces", "missions", "www"]);

/** « Toits Martin & Fils (SARL) » → « toits-martin-fils-sarl ». */
export function adresseDepuis(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ADRESSE_PAGE_MAX)
    .replace(/-+$/g, "");
}

/** La raison d'un refus d'adresse (une phrase pour l'artisan), ou null si elle est valable. */
export function refusAdresse(adresse: string): string | null {
  if (adresse.length < ADRESSE_PAGE_MIN) return `Au moins ${ADRESSE_PAGE_MIN} caractères.`;
  if (adresse.length > ADRESSE_PAGE_MAX) return `${ADRESSE_PAGE_MAX} caractères au plus.`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(adresse)) return "Seulement des lettres sans accent, des chiffres et des tirets.";
  if (MOTS_RESERVES.has(adresse)) return "Cette adresse est réservée.";
  return null;
}

/** Les adresses à essayer dans l'ordre pour une entreprise : son nom, son nom et sa ville, puis numérotées. */
export function adressesCandidates(nom: string, ville: string | null | undefined): string[] {
  const base = adresseDepuis(nom);
  const sure = refusAdresse(base) ? `entreprise-${base}`.replace(/-$/, "").slice(0, ADRESSE_PAGE_MAX) : base;
  const avecVille = ville ? adresseDepuis(`${nom} ${ville}`) : null;
  const liste = [sure, ...(avecVille && avecVille !== sure && !refusAdresse(avecVille) ? [avecVille] : [])];
  for (let i = 2; i <= 99; i++) liste.push(`${sure.slice(0, ADRESSE_PAGE_MAX - 3)}-${i}`);
  return liste.filter((a) => !refusAdresse(a));
}

/* ------------------------------------------------------------------------------------------------------------ Contenu */

/** Les certifications et assurances les plus déclarées (pastilles à toucher) ; l'artisan peut en écrire d'autres. */
/**
 * Relecture du juriste (16 novembre 2026) : pas de « Garantie de parfait achèvement » (une garantie que la loi impose à
 * tous, présentée comme un avantage propre : pratique trompeuse) ni d'« Artisan certifié CMA » (pas un label reconnu).
 */
export const CERTIFICATIONS_SUGGEREES = ["Assurance décennale", "Responsabilité civile pro", "RGE", "Qualibat", "Qualifelec", "QualiPV", "QualiPAC", "Qualigaz"] as const;

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
  prestations: 6,
  prestationTitre: 60,
  prestationTexte: 200,
  realisationTitre: 80,
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

/** Un chantier réalisé : son titre (« Toiture ardoise · Paimpol ») et ses photos, la première en grand. */
export interface RealisationPublique {
  id: string;
  titre: string;
  photos: PhotoPublique[];
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
  /** Le SIRET de l'entreprise (mentions légales de la page, LCEN) ; null s'il n'est pas renseigné. */
  siret: string | null;
  /** La teinte choisie (une des quatre), sinon null : celle du métier. */
  couleur: string | null;
  logo: string | null;
  couverture: PhotoPublique | null;
  prestations: Prestation[];
  realisations: RealisationPublique[];
  /** La photo de l'artisan ou de l'équipe (« À propos »), si elle existe. */
  photoEquipe: PhotoPublique | null;
  /** Missions ouvertes ET une disponibilité publiée ; sinon null. */
  majLe: string;
}

/** La ville de la zone (« Lannion, Perros-Guirec et le Trégor » → « Lannion »). */
export function villeDeLaZone(zone: string | null | undefined): string | null {
  const v = zone?.split(/[,;/(]| et | - /)[0]?.trim();
  return v ? v : null;
}

/** Le GRAND TITRE de l'accueil : le métier et la ville (« Couvreur à Lannion ») ; le nom de l'entreprise vient dessous. */
export function titreAccueil(c: Pick<ContenuPage, "metierPrincipal" | "zone">): string {
  const theme = themeDuMetier(c.metierPrincipal);
  const ville = villeDeLaZone(c.zone);
  return ville ? `${theme.nom} à ${ville}` : theme.nom;
}

/**
 * La ligne de preuves sous le titre (« Entreprise vérifiée · Décennale · 15 ans d'expérience ») : seulement ce qui est
 * vrai (SIRET vérifié, déclarations de l'artisan, année de création) ; trois au plus.
 */
export function preuvesCourtes(c: Pick<ContenuPage, "verifiee" | "certifications" | "creeeEn">, annee: number): string[] {
  const r: string[] = [];
  if (c.verifiee) r.push("Entreprise vérifiée");
  const decennale = c.certifications.find((x) => /d[ée]cennale/i.test(x));
  if (decennale) r.push("Décennale");
  if (c.creeeEn && annee - c.creeeEn >= 2) r.push(`${annee - c.creeeEn} ans d'expérience`);
  for (const x of c.certifications) if (r.length < 3 && x !== decennale && !/responsabilit/i.test(x)) r.push(x);
  return r.slice(0, 3);
}

/** La teinte de la page (une des quatre) : celle de l'artisan, sinon celle de son métier. */
export function teinteDe(c: Pick<ContenuPage, "couleur" | "metierPrincipal">): string {
  return teinteDeLaPage(c.couleur, c.metierPrincipal).hex;
}

/** La photo d'accueil : la couverture choisie, sinon la première photo du premier chantier, sinon aucune. */
export function photoAccueil(c: Pick<ContenuPage, "couverture" | "realisations">): PhotoPublique | null {
  return c.couverture ?? c.realisations[0]?.photos[0] ?? null;
}

export const RUBRIQUES = [
  { id: "prestations", menu: "Prestations" },
  { id: "realisations", menu: "Réalisations" },
  { id: "a-propos", menu: "À propos" },
  { id: "zone", menu: "Zone" },
  { id: "contact", menu: "Contact" },
] as const;
export type Rubrique = (typeof RUBRIQUES)[number]["id"];

/** Les rubriques qui ont un contenu, dans l'ordre : une rubrique vide n'apparaît JAMAIS (ni dans la page ni dans le menu). */
export function rubriquesVisibles(c: ContenuPage): Rubrique[] {
  const r: Rubrique[] = [];
  if (c.prestations.length > 0) r.push("prestations");
  if (c.realisations.length > 0) r.push("realisations");
  // L'accroche se lit sous le grand titre de l'accueil (maquette de Greg, 17 novembre 2026) : seule, elle ne fait pas « À propos ».
  if (c.presentation?.trim() || c.photoEquipe || c.certifications.length > 0 || c.verifiee || c.creeeEn) r.push("a-propos");
  if (c.zone?.trim() || c.adressePostale?.trim()) r.push("zone");
  r.push("contact");
  return r;
}

/** Le menu du haut : Prestations, Réalisations, À propos, Contact (la zone n'y est pas : elle suit « À propos »). */
export function menuDeLaPage(c: ContenuPage): { id: Rubrique; libelle: string }[] {
  const v = rubriquesVisibles(c);
  return RUBRIQUES.filter((r) => r.id !== "zone" && v.includes(r.id)).map((r) => ({ id: r.id, libelle: r.menu }));
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
  const image = photoAccueil(c)?.partage ?? null;
  if (image) d.image = image;
  if (c.siteWeb) d.sameAs = [c.siteWeb];
  if (c.creeeEn) d.foundingDate = String(c.creeeEn);
  if (c.metiers.length) d.knowsAbout = c.metiers.map((m) => libelles[m] ?? m);
  if (c.horaires) d.openingHours = c.horaires;
  if (c.prestations.length) d.makesOffer = c.prestations.map((x) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: x.titre, description: x.texte } }));
  return d;
}

/* -------------------------------------------------------------------------------------------- Textes et coordonnées */

/** Un lien de site web propre (https ajouté s'il manque), ou null s'il n'en est pas un. */
export function siteWebPropre(v: string | null | undefined): string | null {
  const brut = v?.trim();
  if (!brut) return null;
  const avec = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
  // Le moteur n'a pas `URL` (ni navigateur ni Node) : protocole web, hôte à point, ni identifiant ni espace.
  const m = /^(https?):\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(:\d{1,5})?(\/[^\s]*)?$/i.exec(avec);
  if (!m) return null;
  return `${m[1]!.toLowerCase()}://${m[2]!.toLowerCase()}${m[3] ?? ""}${m[4] ?? ""}`.replace(/\/$/, "");
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

export type { ThemeMetier, Prestation };
