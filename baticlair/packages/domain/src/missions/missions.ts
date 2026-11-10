/**
 * MISSIONS ENTRE ENTREPRISES (Greg, 10 novembre 2026, prompt maître « interface et parcours complets ») : Mobiiz assure
 * UNIQUEMENT la mise en relation. Les entreprises conviennent directement du contrat, de la facturation, du paiement, des
 * assurances et de leurs responsabilités. Ce fichier est du domaine pur (aucun import) : les listes de choix, les règles de
 * saisie, les états d'une annonce, les règles d'une conversation (jamais de contact libre), le partage des coordonnées (accord
 * des DEUX entreprises), le contrôle des pièces jointes, les alertes courtes de la cloche et la boîte « Messages et réponses ».
 */

export const PHRASE_MISE_EN_RELATION = "Mobiiz assure uniquement la mise en relation.";
export const PHRASE_TARIF_INDICATIF = "Il ne constitue ni un devis ni un engagement.";
export const PHRASE_DECLARATIF = "Informations déclarées par l'entreprise.";

/** Les métiers proposés d'abord (capture 04b) ; tous les autres restent accessibles par la recherche. */
export const METIERS_BATIMENT_PRINCIPAUX = [
  "Couverture - Toiture", "Zinguerie", "Charpente", "Maçonnerie", "Électricité", "Plomberie - Chauffage", "Menuiserie", "Isolation",
  "Peinture", "Carrelage - Sols", "Terrassement", "Étanchéité", "Façade - Ravalement", "Climatisation",
] as const;
export const METIERS_BATIMENT_AUTRES = [
  "Plâtrerie - Plaquiste", "Bardage", "Serrurerie - Métallerie", "Vitrerie - Miroiterie", "Cuisine - Agencement", "Parquet - Revêtements",
  "Photovoltaïque", "Ventilation", "Démolition", "Désamiantage", "Échafaudage", "Gros œuvre", "VRD - Assainissement", "Paysage - Clôtures",
  "Piscine", "Ascenseurs", "Domotique - Courants faibles", "Ramonage - Fumisterie", "Stores - Fermetures", "Nettoyage de chantier",
] as const;
export const METIERS_BATIMENT: readonly string[] = [...METIERS_BATIMENT_PRINCIPAUX, ...METIERS_BATIMENT_AUTRES];

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** La recherche d'un métier : sans accent ni casse, sur n'importe quel mot. Vide : la liste entière. */
export function chercherMetier(saisie: string, liste: readonly string[] = METIERS_BATIMENT): string[] {
  const q = sansAccent(saisie.trim());
  return q ? liste.filter((m) => sansAccent(m).includes(q)) : [...liste];
}

export type TypeAnnonce = "mission" | "disponibilite";
export type StatutAnnonce = "publiee" | "suspendue" | "fermee";
export type ActionAnnonce = "suspendre" | "reprendre" | "fermer" | "modifier";

/** Suspendre, reprendre, fermer : une annonce fermée ne se rouvre pas (on en publie une autre). */
export function peutAnnonce(statut: StatutAnnonce, action: ActionAnnonce): boolean {
  if (statut === "fermee") return false;
  if (action === "suspendre") return statut === "publiee";
  if (action === "reprendre") return statut === "suspendue";
  return true;
}
export const LIBELLE_STATUT_ANNONCE: Record<StatutAnnonce, string> = { publiee: "Publiée", suspendue: "Suspendue", fermee: "Fermée" };

export interface Choix<T extends string = string> { id: T; libelle: string }
export const TYPES_MISSION: Choix[] = [
  { id: "sous-traitance", libelle: "Sous-traitance" },
  { id: "renfort", libelle: "Renfort ponctuel" },
  { id: "lot-complet", libelle: "Lot complet" },
  { id: "co-traitance", libelle: "Co-traitance" },
];
export const NIVEAUX: Choix[] = [
  { id: "accompagne", libelle: "Débutant accompagné" },
  { id: "autonome", libelle: "Autonome sur ce type de chantier" },
  { id: "confirme", libelle: "Confirmé" },
  { id: "expert", libelle: "Expert" },
];
export const EXPERIENCES: Choix[] = [
  { id: "indifferent", libelle: "Indifférent" },
  { id: "1", libelle: "1 an ou plus" },
  { id: "3", libelle: "3 ans ou plus" },
  { id: "5", libelle: "5 ans ou plus" },
  { id: "10", libelle: "10 ans ou plus" },
];
export const EQUIPES: Choix[] = [
  { id: "1", libelle: "1 personne" },
  { id: "1-2", libelle: "1 à 2 personnes" },
  { id: "2-4", libelle: "2 à 4 personnes" },
  { id: "5+", libelle: "5 personnes ou plus" },
];
export const QUALIFICATIONS: string[] = ["Travail en hauteur", "Échafaudage", "Qualibat", "RGE", "Habilitation électrique", "CACES", "Amiante sous-section 4", "SST", "Soudure", "Permis poids lourd"];
export const MODES_CHIFFRAGE: Choix[] = [
  { id: "jour", libelle: "Tarif journalier" },
  { id: "forfait", libelle: "Forfait" },
  { id: "unite", libelle: "Au métré ou à l'unité" },
  { id: "a-convenir", libelle: "À convenir" },
];
export const FRAIS: Choix[] = [
  { id: "a-convenir", libelle: "À convenir entre les entreprises" },
  { id: "inclus", libelle: "Inclus dans le tarif proposé" },
  { id: "en-sus", libelle: "En supplément" },
];
export const UNITES_TARIF: Choix[] = [
  { id: "personne", libelle: "1 personne" },
  { id: "equipe", libelle: "L'équipe entière" },
];
export const MOTIFS_SIGNALEMENT: Choix[] = [
  { id: "hors-sujet", libelle: "Message sans rapport avec la mission" },
  { id: "demarchage", libelle: "Démarchage ou publicité" },
  { id: "comportement", libelle: "Comportement déplacé" },
  { id: "faux", libelle: "Informations fausses" },
  { id: "autre", libelle: "Autre" },
];
export const libelleDe = (liste: readonly Choix[], id: string | null | undefined): string | null => liste.find((c) => c.id === id)?.libelle ?? null;
const idsDe = (liste: readonly Choix[]) => liste.map((c) => c.id);

export interface Faute { champ: string; message: string }
const jourValide = (j: unknown): j is string => typeof j === "string" && /^\d{4}-\d{2}-\d{2}$/.test(j) && !Number.isNaN(Date.parse(`${j}T00:00:00Z`));
const texte = (v: unknown, min: number, max: number) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
const dans = (liste: readonly Choix[], v: unknown) => typeof v === "string" && idsDe(liste).includes(v);
const montant = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max;

export interface SaisieMission {
  metier: string;
  lieu: string;
  /** Code postal du lieu (5 chiffres) : seul le département en est gardé pour la recherche. */
  codePostal: string;
  debut: string;
  fin: string;
  types: string[];
  description: string;
  niveau?: string | null;
  experience?: string | null;
  qualifications?: string[];
  equipe?: string | null;
  contexte?: string | null;
  modeChiffrage?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  frais?: string | null;
  conditions?: string | null;
}

/** Ce qui manque à une mission avant sa publication. Le budget et les conditions restent facultatifs, toujours indicatifs. */
export function fautesMission(s: SaisieMission, aujourdHui: string): Faute[] {
  const f: Faute[] = [];
  if (!texte(s.metier, 2, 60)) f.push({ champ: "metier", message: "Choisis le métier recherché." });
  if (!texte(s.lieu, 2, 80)) f.push({ champ: "lieu", message: "Indique la commune de la mission." });
  if (!/^\d{5}$/.test(s.codePostal ?? "")) f.push({ champ: "codePostal", message: "Indique le code postal (5 chiffres)." });
  if (!jourValide(s.debut)) f.push({ champ: "debut", message: "Indique la date de début." });
  else if (s.debut < aujourdHui) f.push({ champ: "debut", message: "La date de début est déjà passée." });
  if (!jourValide(s.fin)) f.push({ champ: "fin", message: "Indique la date de fin." });
  else if (jourValide(s.debut) && s.fin < s.debut) f.push({ champ: "fin", message: "La fin ne peut pas précéder le début." });
  if (!Array.isArray(s.types) || s.types.length === 0 || s.types.some((t) => !dans(TYPES_MISSION, t))) f.push({ champ: "types", message: "Choisis le type de mission." });
  if (!texte(s.description, 10, 1500)) f.push({ champ: "description", message: "Décris la mission en quelques mots (10 caractères au moins)." });
  if (s.niveau != null && !dans(NIVEAUX, s.niveau)) f.push({ champ: "niveau", message: "Niveau inconnu." });
  if (s.experience != null && !dans(EXPERIENCES, s.experience)) f.push({ champ: "experience", message: "Expérience inconnue." });
  if (s.equipe != null && !dans(EQUIPES, s.equipe)) f.push({ champ: "equipe", message: "Taille d'équipe inconnue." });
  if ((s.qualifications ?? []).length > 10 || (s.qualifications ?? []).some((q) => !texte(q, 2, 60))) f.push({ champ: "qualifications", message: "Dix qualifications au plus." });
  if (s.contexte != null && !texte(s.contexte, 0, 600)) f.push({ champ: "contexte", message: "Contexte trop long (600 caractères au plus)." });
  if (s.modeChiffrage != null && !dans(MODES_CHIFFRAGE, s.modeChiffrage)) f.push({ champ: "modeChiffrage", message: "Mode de chiffrage inconnu." });
  if (s.budgetMin != null && !montant(s.budgetMin, 1_000_000)) f.push({ champ: "budgetMin", message: "Budget indicatif à corriger." });
  if (s.budgetMax != null && !montant(s.budgetMax, 1_000_000)) f.push({ champ: "budgetMax", message: "Budget indicatif à corriger." });
  if (s.budgetMin != null && s.budgetMax != null && s.budgetMax < s.budgetMin) f.push({ champ: "budgetMax", message: "Le haut de la fourchette est sous le bas." });
  if (s.frais != null && !dans(FRAIS, s.frais)) f.push({ champ: "frais", message: "Frais de déplacement inconnus." });
  if (s.conditions != null && !texte(s.conditions, 0, 600)) f.push({ champ: "conditions", message: "Conditions trop longues (600 caractères au plus)." });
  return f;
}

export interface SaisieDisponibilite {
  metier: string;
  autreMetier?: string | null;
  ville: string;
  codePostal: string;
  rayonKm: number;
  debut: string;
  fin?: string | null;
  types: string[];
  presentation: string;
  equipe?: string | null;
  /** Tarif journalier indicatif HT : facultatif, masquable. */
  tarifJour?: number | null;
  tarifUnite?: string | null;
  dureeMinJours?: number | null;
  negociable?: boolean;
  tarifVisible?: boolean;
}

export function fautesDisponibilite(s: SaisieDisponibilite, aujourdHui: string): Faute[] {
  const f: Faute[] = [];
  if (!texte(s.metier, 2, 60)) f.push({ champ: "metier", message: "Choisis ton métier principal." });
  if (s.autreMetier != null && s.autreMetier !== "" && !texte(s.autreMetier, 2, 60)) f.push({ champ: "autreMetier", message: "Autre métier à corriger." });
  if (!texte(s.ville, 2, 80)) f.push({ champ: "ville", message: "Indique ta commune de départ." });
  if (!/^\d{5}$/.test(s.codePostal ?? "")) f.push({ champ: "codePostal", message: "Indique le code postal (5 chiffres)." });
  if (!(Number.isInteger(s.rayonKm) && s.rayonKm >= 5 && s.rayonKm <= 300)) f.push({ champ: "rayonKm", message: "Zone d'intervention entre 5 et 300 km." });
  if (!jourValide(s.debut)) f.push({ champ: "debut", message: "Indique à partir de quand tu es disponible." });
  if (s.fin != null && s.fin !== "") {
    if (!jourValide(s.fin)) f.push({ champ: "fin", message: "Date de fin à corriger." });
    else if (s.fin < aujourdHui) f.push({ champ: "fin", message: "La période est déjà passée." });
    else if (jourValide(s.debut) && s.fin < s.debut) f.push({ champ: "fin", message: "La fin ne peut pas précéder le début." });
  }
  if (!Array.isArray(s.types) || s.types.length === 0 || s.types.some((t) => !dans(TYPES_MISSION, t))) f.push({ champ: "types", message: "Choisis le type de missions." });
  if (!texte(s.presentation, 10, 1500)) f.push({ champ: "presentation", message: "Présente ton équipe en quelques mots (10 caractères au moins)." });
  if (s.equipe != null && !dans(EQUIPES, s.equipe)) f.push({ champ: "equipe", message: "Taille d'équipe inconnue." });
  if (s.tarifJour != null) {
    if (!montant(s.tarifJour, 10_000)) f.push({ champ: "tarifJour", message: "Tarif journalier à corriger." });
    if (!dans(UNITES_TARIF, s.tarifUnite)) f.push({ champ: "tarifUnite", message: "Dis si le tarif vaut pour une personne ou pour l'équipe." });
  }
  if (s.dureeMinJours != null && !(Number.isInteger(s.dureeMinJours) && s.dureeMinJours >= 1 && s.dureeMinJours <= 365)) f.push({ champ: "dureeMinJours", message: "Durée minimale à corriger." });
  return f;
}

export interface SaisieReponse {
  niveau: string;
  experienceAns: number;
  equipe: number;
  message: string;
  tarifJour?: number | null;
  tarifUnite?: string | null;
  jours?: string | null;
  deplacement?: string | null;
  /** Les documents du dossier professionnel que l'entreprise CHOISIT de partager pour cette mission. */
  documentIds?: string[];
}

export function fautesReponse(s: SaisieReponse): Faute[] {
  const f: Faute[] = [];
  if (!dans(NIVEAUX, s.niveau)) f.push({ champ: "niveau", message: "Indique ton niveau sur cette mission." });
  if (!(Number.isInteger(s.experienceAns) && s.experienceAns >= 0 && s.experienceAns <= 60)) f.push({ champ: "experienceAns", message: "Expérience en années à corriger." });
  if (!(Number.isInteger(s.equipe) && s.equipe >= 1 && s.equipe <= 50)) f.push({ champ: "equipe", message: "Nombre de personnes à corriger." });
  if (!texte(s.message, 1, 1500)) f.push({ champ: "message", message: "Écris un message à l'entreprise." });
  if (s.tarifJour != null) {
    if (!montant(s.tarifJour, 10_000)) f.push({ champ: "tarifJour", message: "Tarif proposé à corriger." });
    if (!dans(UNITES_TARIF, s.tarifUnite)) f.push({ champ: "tarifUnite", message: "Dis si le tarif vaut pour une personne ou pour l'équipe." });
  }
  if (s.jours != null && !texte(s.jours, 0, 120)) f.push({ champ: "jours", message: "Jours disponibles trop longs." });
  if (s.deplacement != null && !dans(FRAIS, s.deplacement)) f.push({ champ: "deplacement", message: "Déplacement inconnu." });
  if ((s.documentIds ?? []).length > 12) f.push({ champ: "documentIds", message: "Douze documents partagés au plus." });
  return f;
}

/* ------------------------------------------------------------------------------------------------ Textes lisibles */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jourMois = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number) as [number, number, number];
  return { j: j === 1 ? "1er" : String(j), m: MOIS[m - 1]! };
};
/** « 14 au 16 novembre », « 28 novembre au 2 décembre », « 14 novembre » (un seul jour). Sans année : une mission est proche. */
export function periodeLisible(debut: string, fin: string | null | undefined): string {
  const d = jourMois(debut);
  if (!fin || fin === debut) return `${d.j} ${d.m}`;
  const f = jourMois(fin);
  return d.m === f.m && debut.slice(0, 7) === fin.slice(0, 7) ? `${d.j} au ${f.j} ${f.m}` : `${d.j} ${d.m} au ${f.j} ${f.m}`;
}
export const jourLisible = (iso: string) => periodeLisible(iso, null);
const euros = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n).replace(/[  ]/g, " ")} €`;
/** « 420 € HT / jour / personne » ; « 420 € HT / jour pour l'équipe ». */
export function tarifLisible(tarif: number, unite: string | null | undefined): string {
  return `${euros(tarif)} HT / jour${unite === "equipe" ? " pour l'équipe" : unite === "personne" ? " / personne" : ""}`;
}
/** « 400 à 500 € HT / jour », « 2 000 € HT » (forfait), « À convenir ». Toujours indicatif. */
export function budgetLisible(mode: string | null | undefined, min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null && max == null) return mode === "a-convenir" ? "À convenir" : null;
  const suffixe = mode === "jour" ? " HT / jour" : " HT";
  const a = min ?? max!;
  const b = max ?? min!;
  return a === b ? `${euros(a)}${suffixe}` : `${new Intl.NumberFormat("fr-FR").format(a).replace(/[  ]/g, " ")} à ${euros(b)}${suffixe}`;
}
/** « Renfort couvreur · 3 jours » n'est pas inventé : le titre d'une mission est son métier et son lieu. */
export function titreMission(metier: string, lieu: string): string {
  return `${metier} · ${lieu}`;
}
export function dureeJours(debut: string, fin: string): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000) + 1;
}
/** « JM », comme l'avatar du menu. */
export function initialesEntreprise(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  return (mots.length > 1 ? mots[0]!.charAt(0) + mots[1]!.charAt(0) : nom.trim().slice(0, 2)).toUpperCase();
}

/* ------------------------------------------------------------------------------------------------ Conversations */

export const MESSAGE_MAX = 2000;
export const CONVERSATIONS_PAR_JOUR = 10;

export interface ContexteOuverture {
  type: TypeAnnonce;
  statut: StatutAnnonce;
  /** L'entreprise qui demande est celle qui a publié l'annonce. */
  demandeurEstAuteur: boolean;
  /** Mission : l'autre entreprise a répondu à CETTE mission (réponse non retirée). */
  reponseExiste: boolean;
  /** L'une des deux entreprises a bloqué l'autre. */
  bloque: boolean;
  /** Le demandeur a un SIRET vérifié. */
  demandeurVerifie: boolean;
  /** Conversations ouvertes par le demandeur depuis 24 h. */
  ouvertesAujourdHui: number;
}
export type RefusOuverture = "bloque" | "non_verifie" | "annonce_fermee" | "sans_reponse" | "soi_meme" | "trop";

/**
 * JAMAIS DE CONTACT LIBRE : une conversation n'existe qu'à propos d'une annonce. Mission : entre l'entreprise qui publie et
 * une entreprise qui y a RÉPONDU, ouverte par celle qui publie. Disponibilité publiée : c'est l'annonce elle-même qui
 * autorise la mise en relation ; une entreprise vérifiée peut écrire à son auteur. Rien d'autre.
 */
export function refusOuverture(c: ContexteOuverture): RefusOuverture | null {
  if (c.bloque) return "bloque";
  if (!c.demandeurVerifie) return "non_verifie";
  if (c.type === "mission") {
    if (!c.demandeurEstAuteur || !c.reponseExiste) return "sans_reponse";
    if (c.statut === "fermee") return "annonce_fermee";
  } else {
    if (c.demandeurEstAuteur) return "soi_meme";
    if (c.statut !== "publiee") return "annonce_fermee";
  }
  if (c.ouvertesAujourdHui >= CONVERSATIONS_PAR_JOUR) return "trop";
  return null;
}
export const PHRASE_REFUS_OUVERTURE: Record<RefusOuverture, string> = {
  bloque: "Cette mise en relation n'est pas possible.",
  non_verifie: "Vérifie d'abord ton entreprise (SIRET) pour contacter une autre entreprise.",
  annonce_fermee: "Cette annonce n'est plus ouverte.",
  sans_reponse: "Une conversation s'ouvre seulement après une réponse à la mission.",
  soi_meme: "C'est ta propre annonce.",
  trop: "Tu as ouvert beaucoup de conversations aujourd'hui. Réessaie demain.",
};

export interface EtatConversation { bloquee: boolean; archiveeParMoi: boolean }
/** Écrire dans une conversation : seulement ses deux entreprises (vérifié par le serveur), jamais quand elle est bloquée. */
export const peutEcrire = (e: EtatConversation) => !e.bloquee;

export type EtatCoordonnees = "privees" | "proposees_par_moi" | "proposees_par_l_autre" | "partagees";
/** Les coordonnées ne se montrent qu'après l'accord EXPLICITE des deux entreprises ; un seul accord ne montre rien. */
export function etatCoordonnees(moi: boolean, autre: boolean): EtatCoordonnees {
  return moi && autre ? "partagees" : moi ? "proposees_par_moi" : autre ? "proposees_par_l_autre" : "privees";
}
const TELEPHONE = /(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
export const COORDONNEES_MASQUEES = "[coordonnées masquées jusqu'à l'accord des deux entreprises]";
/** Tant que les deux entreprises n'ont pas accepté, un numéro ou un e-mail écrit dans un message est masqué à l'affichage. */
export function masquerCoordonnees(texteMessage: string): string {
  return texteMessage.replace(EMAIL, COORDONNEES_MASQUEES).replace(TELEPHONE, COORDONNEES_MASQUEES);
}
export function fauteMessage(t: unknown): string | null {
  if (typeof t !== "string" || t.trim().length === 0) return "Écris ton message.";
  if (t.trim().length > MESSAGE_MAX) return `Message trop long (${MESSAGE_MAX} caractères au plus).`;
  return null;
}

/* ------------------------------------------------------------------------------------------------ Pièces jointes */

/** 4 Mo : la limite d'une requête chez l'hébergeur est de 4,5 Mo ; au-delà, l'envoi échouerait sans explication. */
export const FICHIER_MAX_OCTETS = 4 * 1024 * 1024;
export const FICHIERS_PAR_ANNONCE = 6;
export const DOCUMENTS_PAR_ENTREPRISE = 40;
export const TYPES_FICHIER: Record<string, { extensions: string[]; libelle: string }> = {
  "application/pdf": { extensions: ["pdf"], libelle: "PDF" },
  "image/jpeg": { extensions: ["jpg", "jpeg"], libelle: "Photo" },
  "image/png": { extensions: ["png"], libelle: "Image" },
  "image/webp": { extensions: ["webp"], libelle: "Image" },
};
export const PHRASE_FORMATS = "PDF, JPEG, PNG ou WebP, 4 Mo au plus par fichier.";

/** Le type RÉEL d'un fichier, lu dans ses premiers octets (jamais dans son nom ni dans ce qu'annonce le navigateur). */
export function typeReel(entete: ArrayLike<number>): string | null {
  const o = (i: number) => entete[i] ?? -1;
  if (o(0) === 0x25 && o(1) === 0x50 && o(2) === 0x44 && o(3) === 0x46) return "application/pdf";
  if (o(0) === 0xff && o(1) === 0xd8 && o(2) === 0xff) return "image/jpeg";
  if (o(0) === 0x89 && o(1) === 0x50 && o(2) === 0x4e && o(3) === 0x47) return "image/png";
  if (o(0) === 0x52 && o(1) === 0x49 && o(2) === 0x46 && o(3) === 0x46 && o(8) === 0x57 && o(9) === 0x45 && o(10) === 0x42 && o(11) === 0x50) return "image/webp";
  return null;
}
export type FauteFichier = "vide" | "trop_lourd" | "type_refuse" | "contenu_different" | "nom";
export const PHRASE_FAUTE_FICHIER: Record<FauteFichier, string> = {
  vide: "Ce fichier est vide.",
  trop_lourd: "Ce fichier dépasse 4 Mo.",
  type_refuse: `Format refusé. ${PHRASE_FORMATS}`,
  contenu_different: "Le contenu de ce fichier ne correspond pas à son format.",
  nom: "Nom de fichier à corriger.",
};
/** Type, taille ET contenu : un fichier dont les octets ne sont pas ceux du format annoncé est refusé. */
export function fauteFichier(f: { nom: string; type: string; taille: number }, entete: ArrayLike<number>): FauteFichier | null {
  if (f.taille <= 0) return "vide";
  if (f.taille > FICHIER_MAX_OCTETS) return "trop_lourd";
  if (!f.nom || f.nom.length > 160 || /[\\/\u0000-\u001f]/.test(f.nom)) return "nom";
  const reel = typeReel(entete);
  if (!(f.type in TYPES_FICHIER) || !reel) return "type_refuse";
  if (reel !== f.type) return "contenu_different";
  return null;
}

export type CategorieDocument = "cv" | "presentation" | "assurance" | "qualification" | "realisation" | "reference";
export const CATEGORIES_DOCUMENT: { id: CategorieDocument; libelle: string; groupe: "Dossier" | "Justificatifs" | "Références"; aide: string }[] = [
  { id: "cv", libelle: "CV ou dossier professionnel", groupe: "Dossier", aide: "Un PDF qui présente ton parcours." },
  { id: "presentation", libelle: "Présentation de l'entreprise", groupe: "Dossier", aide: "Services, équipe, zone et expérience" },
  { id: "assurance", libelle: "Assurances", groupe: "Justificatifs", aide: "Responsabilité civile · décennale" },
  { id: "qualification", libelle: "Qualifications", groupe: "Justificatifs", aide: "Qualibat, habilitations et formations" },
  { id: "realisation", libelle: "Réalisations et photos", groupe: "Références", aide: "Photos de chantiers terminés" },
  { id: "reference", libelle: "Références", groupe: "Références", aide: "Attestations et recommandations" },
];

/* ------------------------------------------------------------------------------------------------ Cloche et boîte */

export type CategorieAlerte = "prix" | "groupe" | "missions" | "conseils";
export type GenreAlerte = "action" | "information";
export const CATEGORIES_ALERTE: { id: CategorieAlerte; titre: string; detail: string }[] = [
  { id: "prix", titre: "Demandes de prix", detail: "Réponses et relances des négoces" },
  { id: "groupe", titre: "Achats groupés", detail: "Reconfirmation, offre et échéances" },
  { id: "missions", titre: "Missions", detail: "Réponses, messages et changements" },
  { id: "conseils", titre: "Conseils Mobiiz", detail: "Astuces utiles, jamais obligatoires" },
];
export interface ReglagesAlertes { prix: boolean; groupe: boolean; missions: boolean; conseils: boolean; email: boolean; push: boolean }
export const REGLAGES_ALERTES_DEFAUT: ReglagesAlertes = { prix: true, groupe: true, missions: true, conseils: false, email: true, push: true };

export interface AlerteCourte {
  categorie: CategorieAlerte;
  genre: GenreAlerte;
  titre: string;
  detail: string;
  /** Le libellé du lien, qui ouvre LA bonne action. */
  action: string;
  href: string;
  /** Une alerte par fait : la même clé ne s'écrit jamais deux fois pour une entreprise. */
  cle: string;
}
const court = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
/** LA CLOCHE NE PORTE QUE DES ALERTES COURTES : jamais le texte d'un message ni le contenu d'une proposition. */
export const alerteNouveauMessage = (p: { conversationId: string; entreprise: string; sujet: string; messageId: string }): AlerteCourte => ({
  categorie: "missions", genre: "action", titre: "Nouveau message", detail: court(`${p.entreprise} · ${p.sujet}`, 80), action: "Ouvrir la conversation", href: `/messages/${p.conversationId}`, cle: `message:${p.messageId}`,
});
export const alerteReponseMission = (p: { missionId: string; entreprise: string; sujet: string; reponseId: string }): AlerteCourte => ({
  categorie: "missions", genre: "action", titre: "Nouvelle réponse à ta mission", detail: court(`${p.entreprise} · ${p.sujet}`, 80), action: "Voir les entreprises intéressées", href: `/missions/${p.missionId}/reponses`, cle: `reponse-mission:${p.reponseId}`,
});
export const alerteCoordonnees = (p: { conversationId: string; entreprise: string; partagees: boolean }): AlerteCourte => ({
  categorie: "missions", genre: p.partagees ? "information" : "action", titre: p.partagees ? "Coordonnées partagées" : "Échange de coordonnées proposé", detail: court(p.entreprise, 80), action: p.partagees ? "Voir les coordonnées" : "Répondre à la proposition", href: `/messages/${p.conversationId}`, cle: `coordonnees:${p.conversationId}:${p.partagees ? "ok" : "proposees"}`,
});
export const alertePropositionNegoce = (p: { emailId: string; negoce: string; chantier: string | null }): AlerteCourte => ({
  categorie: "prix", genre: "action", titre: "Nouvelle proposition reçue", detail: court([p.negoce, p.chantier].filter(Boolean).join(" · "), 80), action: "Voir la proposition", href: `/messages/negoce/${p.emailId}`, cle: `negoce:${p.emailId}`,
});

export type SorteBoite = "mission" | "negoce";
export type FiltreBoite = "tous" | "missions" | "negoces" | "non-lus";
export interface ElementBoite {
  /** Les deux circuits restent séparés : la clé dit d'où vient l'élément (« mission:<id> », « negoce:<id> »). */
  cle: string;
  sorte: SorteBoite;
  titre: string;
  sujet: string | null;
  extrait: string;
  le: string;
  nonLu: boolean;
  href: string;
}
export const FILTRES_BOITE: Choix<FiltreBoite>[] = [
  { id: "tous", libelle: "Tous" },
  { id: "missions", libelle: "Missions" },
  { id: "negoces", libelle: "Négoces" },
  { id: "non-lus", libelle: "Non lus" },
];
export function filtrerBoite(items: ElementBoite[], filtre: FiltreBoite, recherche = ""): ElementBoite[] {
  const q = sansAccent(recherche.trim());
  return items
    .filter((i) => (filtre === "tous" ? true : filtre === "missions" ? i.sorte === "mission" : filtre === "negoces" ? i.sorte === "negoce" : i.nonLu))
    .filter((i) => !q || sansAccent(`${i.titre} ${i.sujet ?? ""} ${i.extrait}`).includes(q))
    .sort((a, b) => b.le.localeCompare(a.le) || a.cle.localeCompare(b.cle));
}
/** « Aujourd'hui » puis « Plus tôt » (heure de Paris). */
export function groupesBoite(items: ElementBoite[], maintenant: Date): { titre: string; items: ElementBoite[] }[] {
  const jour = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);
  const auj = jour(maintenant);
  const a = items.filter((i) => jour(new Date(i.le)) === auj);
  const b = items.filter((i) => jour(new Date(i.le)) !== auj);
  return [{ titre: "Aujourd'hui", items: a }, { titre: "Plus tôt", items: b }].filter((g) => g.items.length > 0);
}
/** « 09:42 » le jour même, « hier », sinon le jour de la semaine (moins de 7 jours) ou « 3 nov. ». */
export function quandBoite(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  const jour = (x: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(x);
  const ecart = Math.round((Date.parse(`${jour(maintenant)}T00:00:00Z`) - Date.parse(`${jour(d)}T00:00:00Z`)) / 86_400_000);
  if (ecart <= 0) return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d);
  if (ecart === 1) return "hier";
  if (ecart < 7) return new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }).format(d);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(d);
}

/** La catégorie d'une notification d'après l'écran qu'elle ouvre (réglages de la cloche, de l'e-mail et du push). */
export function categorieDuLien(url: string): CategorieAlerte | null {
  if (/^\/(missions|messages(?!\/negoce))/.test(url)) return "missions";
  if (/^\/(achats-groupes|regroupements|groupe)/.test(url)) return "groupe";
  if (/^\/(chantiers|recus|messages\/negoce|fournisseurs)/.test(url)) return "prix";
  return null;
}
