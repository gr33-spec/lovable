import { PHRASE_REMUNERATION_NEGOCE } from "./demande.js";
import { auNom, duNom, leNom } from "./nom.js";
import { deMois, type Mois } from "./commande-du-mois.js";
import { NOM_APP } from "./marque.js";

/**
 * L'ESPACE NÉGOCE AUTONOME (Greg, 23 octobre 2026) : « que Greg n'intervienne jamais entre un artisan et un négoce ».
 * Le négoce crée son accès depuis un lien d'invitation unique, déclare ses dépôts et ses paliers de livraison, s'abonne
 * à ses départements, reçoit chaque grille à la clôture, chiffre en prix fermes et tient sa grille 30 jours s'il est
 * retenu. Tout ici est du calcul pur et des textes (vouvoiement côté négoce).
 */

// ——— Les paliers de livraison (point 2) ———

export interface PalierPayant {
  /** Ce prix HT par livraison vaut jusqu'à cette distance (km, par la route). */
  jusquaKm: number;
  prixHt: number;
}

/** « Gratuite jusqu'à X km », jusqu'à deux paliers payants, puis « je ne livre pas au-delà de N km ». Communs à tous les dépôts. */
export interface PaliersLivraison {
  gratuiteJusquaKm: number;
  paliers: PalierPayant[];
  maxKm: number;
}

/** Les valeurs proposées à l'inscription (modifiables) : 30 km gratuit, 80 € jusqu'à 60 km, 100 km au plus. */
export const PALIERS_DEFAUT: PaliersLivraison = { gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 60, prixHt: 80 }], maxKm: 100 };

/** Les paliers tels que saisis, vérifiés : nombres positifs, distances croissantes, deux paliers payants au plus, max ≥ tout. */
export function lirePaliers(p: unknown): PaliersLivraison | null {
  if (!p || typeof p !== "object") return null;
  const v = p as { gratuiteJusquaKm?: unknown; paliers?: unknown; maxKm?: unknown };
  const nombre = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : typeof x === "string" && x.trim() ? lireNombre(x) : null);
  const gratuite = nombre(v.gratuiteJusquaKm);
  const max = nombre(v.maxKm);
  if (gratuite === null || max === null || max > 2000) return null;
  const brut = Array.isArray(v.paliers) ? v.paliers : [];
  if (brut.length > 2) return null;
  const paliers: PalierPayant[] = [];
  for (const x of brut) {
    const o = x as { jusquaKm?: unknown; prixHt?: unknown };
    const km = nombre(o.jusquaKm);
    const prix = nombre(o.prixHt);
    if (km === null || prix === null) return null;
    paliers.push({ jusquaKm: km, prixHt: prix });
  }
  let borne = gratuite;
  for (const x of paliers) {
    if (x.jusquaKm <= borne) return null;
    borne = x.jusquaKm;
  }
  if (max < borne) return null;
  return { gratuiteJusquaKm: gratuite, paliers, maxKm: max };
}

function lireNombre(t: string): number | null {
  const n = Number(t.replace(/[\s€  km]/gi, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Le prix d'UNE livraison selon les paliers : 0 jusqu'à la distance gratuite, le palier payant dont la borne couvre la
 * distance, `null` au-delà de la distance maximale (« ne livre pas »). Une distance inconnue (adresse introuvable) se
 * compte au dernier palier payant ; sans palier payant, elle n'est pas livrable : on n'annonce jamais une livraison
 * gratuite qu'on n'a pas vérifiée.
 */
export function fraisDeLivraisonPaliers(distanceKm: number | null, p: PaliersLivraison): number | null {
  if (distanceKm === null) return p.paliers.at(-1)?.prixHt ?? null;
  if (distanceKm > p.maxKm) return null;
  if (distanceKm <= p.gratuiteJusquaKm) return 0;
  const palier = p.paliers.find((x) => distanceKm <= x.jusquaKm);
  if (palier) return palier.prixHt;
  // Entre le dernier palier payant et la distance maximale : le dernier palier vaut ; sans palier payant, la zone
  // gratuite seule est livrée.
  return p.paliers.at(-1)?.prixHt ?? null;
}

/** « Gratuite jusqu'à 30 km, 80 € jusqu'à 60 km, pas de livraison au-delà de 100 km » : les paliers en une phrase. */
export function phrasePaliers(p: PaliersLivraison): string {
  const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
  const morceaux = [`gratuite jusqu'à ${p.gratuiteJusquaKm} km`, ...p.paliers.map((x) => `${euros(x.prixHt)} HT jusqu'à ${x.jusquaKm} km`), `pas de livraison au-delà de ${p.maxKm} km`];
  return `Livraison ${morceaux.join(", ")}.`;
}

// ——— La garantie 30 jours (point 6) ———

export const GARANTIE_JOURS = 30;

/** Le négoce retenu tient ses prix 30 jours après la publication des résultats. */
export function finDeGarantie(resultatsLe: Date): Date {
  return new Date(resultatsLe.getTime() + GARANTIE_JOURS * 86_400_000);
}

const dateFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(d);

/** « Prix garantis jusqu'au 21 novembre » : le titre du bloc côté artisan. */
export const titreGarantie = (jusquau: Date) => `Prix garantis jusqu'au ${dateFr(jusquau)}`;

/** La mention du bon de commande d'une recommande : « Commande sur grille garantie du 15 octobre ». */
export const mentionGarantie = (mois: Mois) => `Commande sur grille garantie ${deMois(mois)}`;

/** La mention du bon de commande d'un cycle : « Prix ferme du regroupement du 15 octobre ». */
export const mentionPrixFerme = (mois: Mois) => `Prix ferme ${duNom()} ${deMois(mois)}`;

// ——— Les textes côté négoce (vouvoiement, jamais un nom d'artisan) ———

/** L'invitation (point 1) : « Un artisan de votre secteur vous a ajouté… », sans le nommer. */
export function mailInvitationNegoce(m: { lien: string; departement: string | null; conditions: string; opposition: string }): { objet: string; texte: string } {
  const secteur = m.departement ? ` (${m.departement})` : "";
  return {
    objet: `Des artisans de votre secteur vous ont ajouté ${auNom()} : créez votre accès`,
    texte: [
      "Bonjour,",
      "",
      // RGPD (24 octobre 2026) : qui écrit, pourquoi, et comment ne plus jamais être contacté.
      `Ce message vous est envoyé par BATI INVEST (${NOM_APP}) pour ${leNom()}.`,
      `Pourquoi ce message ? Un artisan de votre secteur${secteur} vous a ajouté ${auNom()} : les artisans d'un même département regroupent leurs commandes de matériaux, une grille unique vous est envoyée toutes les deux semaines et vous faites votre prix.`,
      "Créez votre accès en une minute (votre e-mail, vos dépôts, vos conditions de livraison) :",
      m.lien,
      "",
      `Ce lien est valable 90 jours. Les conditions ${duNom()} : ${m.conditions}`,
      "Aucun frais pour vous. Sans accès créé, vous recevez au plus trois rappels, puis vos coordonnées sont effacées.",
      `Ne plus jamais être contacté : ${m.opposition}`,
      "",
      NOM_APP,
    ].join("\n"),
  };
}

/** Le lien magique de connexion (point 1) : pas de mot de passe. */
export function mailLienDeConnexion(m: { lien: string }): { objet: string; texte: string } {
  return {
    objet: `Votre lien de connexion ${NOM_APP}`,
    texte: ["Bonjour,", "", "Voici votre lien de connexion à votre espace négoce (valable 30 minutes) :", m.lien, "", "Si vous n'avez rien demandé, ignorez cet e-mail.", "", NOM_APP].join("\n"),
  };
}

/** À la clôture, à un négoce invité qui n'a pas encore créé son accès (3 fois au plus). */
export function mailClotureSansCompte(m: { mois: Mois; departement: string; lien: string; opposition: string }): { objet: string; texte: string } {
  return {
    objet: `La grille ${deMois(m.mois)} (${m.departement}) est prête : créez votre accès pour la chiffrer`,
    texte: [
      "Bonjour,",
      "",
      `Ce message vous est envoyé par BATI INVEST (${NOM_APP}) pour ${leNom()}, parce qu'un artisan de votre secteur vous y a ajouté.`,
      `Les artisans du département ${m.departement} ont regroupé leurs commandes ${deMois(m.mois)}. Pour voir la grille et faire votre prix, créez votre accès (une minute) :`,
      m.lien,
      "",
      "Vous recevrez ensuite chaque grille de votre secteur à sa clôture. Aucun frais pour vous.",
      `Ne plus jamais être contacté : ${m.opposition}`,
      "",
      NOM_APP,
    ].join("\n"),
  };
}

/** Après l'inscription : la seule chose que le négoce voit. */
export const phraseApresInscription = (clotureLe: Date) =>
  `Vous recevrez la prochaine grille de votre secteur à la clôture du ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "numeric" }).format(clotureLe).replace(/^1 /, "1er ").replace(/\s?h$/, " h")}.`;

/** L'écran de réponse (point 5) : rappel au-dessus du bouton. */
export const PHRASE_PRIX_FERMES_VOLUME = "Prix fermes, quel que soit le volume final.";

// ——— Les conditions (point 7), 10 points, vouvoiement ———

/**
 * La version des conditions (mise en conformité du 24 octobre 2026). Une version MAJEURE (`CONDITIONS_NEGOCE_MAJEURE`)
 * est redemandée au négoce avant son prochain dépôt ; la date et la version acceptées sont gardées sur son compte.
 */
export const CONDITIONS_NEGOCE_VERSION = "2026-10-24";
export const CONDITIONS_NEGOCE_MAJEURE = "2026-10-24";
/** Une version acceptée est-elle à jour ? Les versions sont des dates : l'ordre alphabétique suffit. */
export const conditionsNegoceAJour = (acceptee: string | null | undefined) => !!acceptee && acceptee >= CONDITIONS_NEGOCE_MAJEURE;

export const CONDITIONS_NEGOCE: readonly { titre: string; texte: string }[] = [
  { titre: "Une seule grille, la même pour tous", texte: "À chaque commande, une seule grille par métier et par département : les besoins des artisans additionnés, les mêmes articles et les mêmes quantités pour chaque négoce consulté." },
  { titre: "Prix fermes, quel que soit le volume", texte: "En répondant à une grille, vous vous engagez sur un prix unitaire HT par article, valable pour tout le cycle, quelle que soit la quantité finalement commandée par les artisans." },
  { titre: "Un seul prix par article, pour tous", texte: "Chaque artisan de la commande achète au même prix unitaire. Vous pouvez marquer un article « prix non garanti » (matière cotée, par exemple le zinc) : il est alors indicatif, à part du comparatif." },
  { titre: "Garantie 30 jours si vous êtes retenu", texte: "Si votre grille est la moins chère sur le total de la commande, vous tenez ces prix 30 jours après la publication des résultats, pour tout artisan de votre zone, y compris ceux qui n'avaient rien déposé." },
  { titre: "Livraison selon vos paliers", texte: "Vous déclarez vos dépôts et vos paliers : gratuite jusqu'à une distance, un ou deux paliers payants, une distance maximale. Le prix livré de chaque artisan se calcule depuis votre dépôt le plus proche de son chantier ; au-delà de votre distance maximale, vous n'apparaissez pas dans son comparatif." },
  { titre: "Confidentialité des artisans", texte: "Jusqu'à sa commande, vous ne voyez d'un artisan ni son nom, ni son entreprise, ni son téléphone, ni son adresse exacte : seulement la grille (articles, quantités cumulées) et les communes de livraison. Ses coordonnées vous parviennent avec son bon de commande, et à vous seul." },
  { titre: "Concurrence : vos prix restent les vôtres", texte: "Les prix d'un négoce ne sont jamais communiqués à un autre négoce, ni pendant ni après la consultation. Pendant le délai, vous savez seulement combien de négoces sont consultés (jamais lesquels) et si vous êtes premier sur le total. Il n'existe aucun classement public." },
  { titre: "Ni vendeur ni acheteur", texte: `BATI INVEST (${NOM_APP}) met en relation, sans rien vendre ni acheter. Le contrat de vente est conclu directement entre l'artisan et vous : il commande sur son compte chez vous, vous le livrez et le facturez comme d'habitude. ${NOM_APP} n'encaisse aucun paiement et ne porte aucun risque d'impayé.` },
  { titre: "Aucun coût pour l'instant", texte: PHRASE_REMUNERATION_NEGOCE },
  { titre: "Désabonnement libre", texte: "Vous pouvez vous désabonner d'un département ou de tout, ou supprimer votre compte, à tout moment, depuis votre espace ou le lien présent dans chaque e-mail." },
  { titre: "Liberté de ne pas répondre", texte: "Vous répondez aux cycles que vous voulez. Ne pas répondre à une grille n'a aucune conséquence." },
  { titre: "Vos données", texte: "Votre e-mail, votre SIRET, vos dépôts et vos paliers servent uniquement à vous envoyer les grilles de votre secteur et à calculer les prix livrés. Vous pouvez les télécharger ou supprimer votre compte depuis votre espace. Voir la page Confidentialité." },
  { titre: "Versions et droit applicable", texte: "Une nouvelle version majeure de ces conditions vous est présentée avant votre prochain dépôt ; la date et la version acceptées sont enregistrées. Ces conditions sont soumises au droit français ; en cas de litige, après recherche d'une solution amiable, le tribunal de commerce de Saint-Brieuc est seul compétent." },
];
