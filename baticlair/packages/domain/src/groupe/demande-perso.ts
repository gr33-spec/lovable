import { normalizeText } from "../trades/trade-profile.js";
import { referenceStricte } from "./reference-stricte.js";
import { uniteRepere } from "./regroupements.js";

/**
 * LA DEMANDE PERSO (Greg, 25 octobre 2026, recentrage : « le cœur, immédiat, sans cycle ») : après la validation du
 * quantitatif, l'artisan l'envoie à ses négoces (habituels, de la zone, ou un nouveau par e-mail), avec un BUT
 * (« Chiffrer un chantier » ou « Commander ») et son accord explicite pour transmettre son identité. Chaque négoce reçoit
 * un e-mail propre au nom de l'artisan et un lien sécurisé pour chiffrer en ligne sans compte (prix par ligne,
 * livraison, délai, validité). Relance automatique à 48 h ouvrées sans réponse ; la demande se clôt à la date de besoin.
 * Ce fichier : les règles et les textes, sans base ni IA.
 */

export const BUTS_DEMANDE = ["chiffrer", "commander"] as const;
export type ButDemande = (typeof BUTS_DEMANDE)[number];
export const LIBELLES_BUT: Readonly<Record<ButDemande, string>> = { chiffrer: "Chiffrer un chantier", commander: "Commander" };

/** La phrase que l'artisan coche avant l'envoi (son identité part chez le négoce). */
export const ACCORD_IDENTITE = "J'accepte que mon nom, mon entreprise et mes coordonnées soient transmis aux négoces choisis pour qu'ils me répondent.";

export const HEURES_OUVREES_RELANCE = 48;

const estOuvre = (d: Date) => {
  const j = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(d);
  return !/^(Sat|Sun)/.test(j);
};

/**
 * `heures` heures OUVRÉES après `depuis` (lundi à vendredi, jours entiers ; les jours fériés ne sont pas comptés) : un
 * envoi du vendredi 10 h se relance le mardi 10 h.
 */
export function plusHeuresOuvrees(depuis: Date, heures: number): Date {
  let d = new Date(depuis);
  let restantes = heures;
  // Un envoi du week-end compte à partir du lundi même heure.
  while (!estOuvre(d)) d = new Date(d.getTime() + 86_400_000);
  while (restantes > 0) {
    const pas = Math.min(restantes, 24);
    d = new Date(d.getTime() + pas * 3_600_000);
    while (!estOuvre(d)) d = new Date(d.getTime() + 86_400_000);
    restantes -= pas;
  }
  return d;
}

/** Faut-il relancer ce négoce ? Une seule relance, à 48 h ouvrées, sans réponse, demande encore ouverte. */
export function relanceDue(r: { envoyeLe: Date; reponduLe: Date | null; relanceLe: Date | null }, maintenant: Date, closLe: Date | null): boolean {
  if (r.reponduLe || r.relanceLe) return false;
  if (closLe && maintenant >= closLe) return false;
  return maintenant >= plusHeuresOuvrees(r.envoyeLe, HEURES_OUVREES_RELANCE);
}

/** La demande se clôt à la date de besoin (minuit, heure de Paris, le lendemain) ; sans date, 30 jours après l'envoi. */
export function clotureDeLaDemande(envoyeLe: Date, dateBesoin: Date | null): Date {
  if (dateBesoin) return new Date(dateBesoin.getTime() + 86_400_000);
  return new Date(envoyeLe.getTime() + 30 * 86_400_000);
}

export interface LigneDemandee {
  cle: string;
  designation: string;
  quantite: number;
  unite: string;
}

/**
 * Le bloc ajouté au mail de demande de devis (§45, inchangé : il est déjà au nom de l'artisan et signé par lui) : le but
 * de la demande et le lien de chiffrage en ligne, sans compte. Vouvoiement.
 */
export function blocLienChiffrage(m: { but: ButDemande; lien: string; nomApp: string }): string {
  return [
    m.but === "commander" ? "Je compte commander : merci de m'indiquer votre meilleur prix livré." : "C'est pour chiffrer un chantier.",
    `Vous pouvez chiffrer en ligne, sans compte, en deux minutes (prix par ligne, livraison, délai et validité de votre offre) :`,
    m.lien,
    `Lien envoyé par ${m.nomApp} pour mon entreprise. Vos prix ne sont vus que par moi.`,
  ].join("\n");
}

/** La relance à 48 h ouvrées (vouvoiement). */
export function mailRelanceDemandePerso(m: { entreprise: string; lien: string }): { objet: string; texte: string } {
  return {
    objet: `Rappel : la demande de prix de ${m.entreprise} attend votre réponse`,
    texte: ["Bonjour,", "", `${m.entreprise} attend toujours votre prix. Le lien reste ouvert jusqu'à la date de besoin :`, m.lien, "", "Si vous ne pouvez pas répondre, un clic sur « Je ne chiffre pas » suffit."].join("\n"),
  };
}

/** Après la première réponse : l'invitation à créer son compte pour recevoir les regroupements de sa zone. */
export const PHRASE_COMPTE_APRES_REPONSE = "Merci, votre offre est partie. Créez votre compte négoce pour recevoir aussi les regroupements de votre zone : des volumes groupés sur lesquels vous positionner.";

export interface ReponseNegocePerso {
  negoceId: string;
  nom: string;
  /** { <clé de ligne> : prix unitaire HT } ; une ligne absente n'est pas chiffrée. */
  prix: Readonly<Record<string, number>>;
  livraisonHt: number;
  delaiJours: number | null;
  validiteJours: number;
  deposeLe: Date;
}

export interface OffreComparee {
  negoceId: string;
  nom: string;
  totalLignesHt: number;
  livraisonHt: number;
  totalLivreHt: number;
  lignesChiffrees: number;
  lignesManquantes: string[];
  complete: boolean;
  delaiJours: number | null;
  valideJusquau: Date;
  valide: boolean;
  /** Écart avec la meilleure offre complète (0 pour elle). */
  ecartHt: number | null;
}

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Les réponses comparées LIVRAISON COMPRISE : d'abord les offres complètes et encore valides, de la moins chère à la plus
 * chère, puis les partielles (« 2 lignes non chiffrées »), puis les échues. Jamais un prix d'un autre artisan.
 */
export function comparerLesReponses(lignes: readonly LigneDemandee[], reponses: readonly ReponseNegocePerso[], maintenant: Date): OffreComparee[] {
  const offres = reponses.map((r): OffreComparee => {
    let total = 0;
    const manquantes: string[] = [];
    for (const l of lignes) {
      const pu = r.prix[l.cle];
      if (pu === undefined) manquantes.push(l.designation);
      else total += pu * l.quantite;
    }
    const valideJusquau = new Date(r.deposeLe.getTime() + r.validiteJours * 86_400_000);
    return {
      negoceId: r.negoceId,
      nom: r.nom,
      totalLignesHt: arrondi2(total),
      livraisonHt: arrondi2(r.livraisonHt),
      totalLivreHt: arrondi2(total + r.livraisonHt),
      lignesChiffrees: lignes.length - manquantes.length,
      lignesManquantes: manquantes,
      complete: manquantes.length === 0,
      delaiJours: r.delaiJours,
      valideJusquau,
      valide: maintenant <= valideJusquau,
      ecartHt: null,
    };
  });
  const rang = (o: OffreComparee) => (o.valide ? (o.complete ? 0 : 1) : 2);
  offres.sort((a, b) => rang(a) - rang(b) || a.totalLivreHt - b.totalLivreHt || a.nom.localeCompare(b.nom, "fr"));
  const meilleure = offres.find((o) => o.valide && o.complete);
  for (const o of offres) if (meilleure && o.complete && o.valide) o.ecartHt = arrondi2(o.totalLivreHt - meilleure.totalLivreHt);
  return offres;
}

/** « 2 lignes non chiffrées », « Valable jusqu'au 2 novembre ». */
export const phraseLignesManquantes = (n: number) => `${n} ligne${n > 1 ? "s" : ""} non chiffrée${n > 1 ? "s" : ""}`;

/* ---------------------------------------------------------------------------------------------------------------------
 * « MES PRIX » (Greg : « ce qui fait rester ») : l'historique des prix reçus et payés PAR CET ARTISAN, par article :
 * dernier prix, meilleur prix, négoce, date. Jamais le prix d'un autre artisan, jamais un prix qu'il n'a pas reçu.
 * ------------------------------------------------------------------------------------------------------------------- */

export interface PrixRecu {
  designation: string;
  unite: string;
  prixHt: number;
  negoce: string;
  date: Date;
  /** « recu » : une offre reçue ; « paye » : une offre commandée. */
  source: "recu" | "paye";
}

/** La clé d'un article dans « Mes prix » : la référence stricte quand elle existe, sinon la désignation normalisée. */
export function cleDeMesPrix(designation: string, unite: string): string {
  const r = referenceStricte(designation);
  const base = r.ok ? r.reference.cle : `lib:${normalizeText(designation).replace(/[^a-z0-9]+/g, " ").trim()}`;
  return `${base}#${uniteRepere(unite)}`;
}

export interface ArticleDeMesPrix {
  cle: string;
  designation: string;
  unite: string;
  dernier: { prixHt: number; negoce: string; date: Date; source: "recu" | "paye" };
  meilleur: { prixHt: number; negoce: string; date: Date };
  nombre: number;
}

/** Les articles de « Mes prix », du plus récent au plus ancien ; `depuis` limite la fenêtre (gratuit : 3 mois). */
export function mesPrix(prix: readonly PrixRecu[], depuis: Date | null = null): ArticleDeMesPrix[] {
  const parCle = new Map<string, PrixRecu[]>();
  for (const p of prix) {
    if (depuis && p.date < depuis) continue;
    if (!(p.prixHt > 0)) continue;
    const cle = cleDeMesPrix(p.designation, p.unite);
    parCle.set(cle, [...(parCle.get(cle) ?? []), p]);
  }
  const articles: ArticleDeMesPrix[] = [];
  for (const [cle, liste] of parCle) {
    const parDate = [...liste].sort((a, b) => b.date.getTime() - a.date.getTime() || (a.source === "paye" ? -1 : 1));
    const dernier = parDate[0]!;
    const meilleur = [...liste].sort((a, b) => a.prixHt - b.prixHt || b.date.getTime() - a.date.getTime())[0]!;
    articles.push({
      cle,
      designation: dernier.designation,
      unite: dernier.unite,
      dernier: { prixHt: dernier.prixHt, negoce: dernier.negoce, date: dernier.date, source: dernier.source },
      meilleur: { prixHt: meilleur.prixHt, negoce: meilleur.negoce, date: meilleur.date },
      nombre: liste.length,
    });
  }
  return articles.sort((a, b) => b.dernier.date.getTime() - a.dernier.date.getTime());
}

/** Le repère discret sur une nouvelle demande : « Ton dernier prix pour cet article : 1,12 € HT / pièce ». */
export function phraseDernierPrix(a: Pick<ArticleDeMesPrix, "dernier" | "unite">): string {
  const prix = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(a.dernier.prixHt).replace(/ | /g, " ");
  return `Ton dernier prix pour cet article : ${prix} HT / ${a.unite.replace(/s$/, "")}`;
}
