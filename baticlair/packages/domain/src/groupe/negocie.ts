import { referenceStricte, type ReferenceStricte } from "./reference-stricte.js";
import { phraseParticipants, SEUIL_ANONYMAT_DEFAUT } from "./regroupements.js";

/**
 * LE REGROUPEMENT NÉGOCIÉ PAR UN HUMAIN (Greg, 25 octobre 2026, « business model final ») : l'app fait le quantitatif et
 * l'envoie aux négoces de l'artisan ; quand des besoins se groupent, un « chasseur d'opportunités » de Mobiiz négocie
 * par téléphone pour tout le monde, saisit l'offre, et chaque artisan l'accepte ou la refuse. La consultation
 * automatique (cycles, grilles, paliers) reste dans le code, derrière `MODE_REGROUPEMENT=automatique`.
 */

export const MODES_REGROUPEMENT = ["humain", "automatique"] as const;
export type ModeRegroupement = (typeof MODES_REGROUPEMENT)[number];
export const MODE_REGROUPEMENT_DEFAUT: ModeRegroupement = "humain";
export const lireModeRegroupement = (v: unknown): ModeRegroupement => (v === "automatique" ? "automatique" : "humain");

/** Commission Mobiiz par défaut sur une offre négociée, en %, intégrée au prix affiché (saisie par le chasseur). */
export const COMMISSION_DEFAUT = 2;

/**
 * Les gros articles qui se négocient en groupe (Greg : ardoise, zinc, bois, isolation de toiture ; jamais crochets,
 * liteaux ni visserie). Les types de `referenceStricte` retenus ; les autres métiers suivront.
 */
export const TYPES_NEGOCIABLES: readonly string[] = ["ardoise", "ardoise-fibres-ciment", "zinc", "bois-charpente", "volige", "osb", "isolant"];

/** Deux dates de besoin se groupent si elles sont à moins de 30 jours l'une de l'autre (choix de Claude, DECISIONS.md). */
export const FENETRE_COMPATIBLE_JOURS = 30;

export const STATUTS_REGROUPEMENT_NEGOCIE = ["en_collecte", "en_negociation", "offre_recue", "commande", "abandonne"] as const;
export type StatutRegroupementNegocie = (typeof STATUTS_REGROUPEMENT_NEGOCIE)[number];
const PASSAGES: Readonly<Record<StatutRegroupementNegocie, readonly StatutRegroupementNegocie[]>> = {
  en_collecte: ["en_negociation", "abandonne"],
  en_negociation: ["offre_recue", "en_collecte", "abandonne"],
  offre_recue: ["commande", "abandonne", "en_negociation"],
  commande: [],
  abandonne: [],
};
export const passageRegroupement = (de: StatutRegroupementNegocie, vers: StatutRegroupementNegocie) => PASSAGES[de].includes(vers);

/** Ce que voit l'artisan, en mots simples : pas de cycle, pas de palier, pas de fenêtre à expliquer. */
export const LIBELLES_REGROUPEMENT_NEGOCIE: Readonly<Record<StatutRegroupementNegocie, string>> = {
  en_collecte: "Regroupement en cours",
  en_negociation: "En cours de négociation par Mobiiz",
  offre_recue: "Offre reçue",
  commande: "Commandé",
  abandonne: "Pas d'offre cette fois",
};

/** veille (ligne d'une demande perso qui attend un regroupement) | declare | accepte | refuse | non_merci | retire. */
export const STATUTS_BESOIN_NEGOCIE = ["veille", "declare", "accepte", "refuse", "non_merci", "retire"] as const;
export type StatutBesoinNegocie = (typeof STATUTS_BESOIN_NEGOCIE)[number];

export type RefusNegociable = "non_negociable" | "reference";

/** Un article se négocie-t-il en groupe ? Gros article identique seulement ; dans le doute, non. */
export function articleNegociable(designation: string): { ok: true; reference: ReferenceStricte } | { ok: false; raison: RefusNegociable } {
  const r = referenceStricte(designation);
  if (!r.ok) return { ok: false, raison: "reference" };
  if (!TYPES_NEGOCIABLES.includes(r.reference.type)) return { ok: false, raison: "non_negociable" };
  return { ok: true, reference: r.reference };
}

export function phraseRefusNegociable(raison: RefusNegociable): string {
  return raison === "non_negociable"
    ? "Seuls les gros articles se regroupent (ardoise, zinc, bois, isolant) : garde cette ligne dans ta demande perso."
    : "Référence pas assez précise pour être regroupée (format, épaisseur, origine…) : précise-la ou garde-la dans ta demande perso.";
}

const JOUR = 86_400_000;
const jourUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
export const datesCompatibles = (a: Date, b: Date, jours = FENETRE_COMPATIBLE_JOURS) => Math.abs(jourUtc(a) - jourUtc(b)) <= jours * JOUR;

/** Un besoin rejoint-il ce regroupement ? Même référence, même département, dates compatibles, regroupement encore ouvert. */
export function rejointLeRegroupement(
  besoin: { cle: string; departement: string; dateBesoin: Date },
  regroupement: { cle: string; departement: string; dateBesoinMin: Date | null; statut: StatutRegroupementNegocie },
): boolean {
  if (regroupement.statut !== "en_collecte" && regroupement.statut !== "en_negociation") return false;
  if (besoin.cle !== regroupement.cle || besoin.departement !== regroupement.departement) return false;
  return !regroupement.dateBesoinMin || datesCompatibles(besoin.dateBesoin, regroupement.dateBesoinMin);
}

const arrondi = (n: number, pas: number) => Math.round(n / pas) * pas;
const centimes = (n: number) => Math.round(n * 100) / 100;

/** Le prix affiché à l'artisan : prix négocié + commission Mobiiz, au centime (4 décimales sous 1 €). */
export function prixAffiche(prixNegocieHt: number, commissionPct: number): number {
  const p = prixNegocieHt * (1 + commissionPct / 100);
  return p < 1 ? Math.round(p * 10_000) / 10_000 : centimes(p);
}

/** La commission d'une commande acceptée : (prix affiché − prix négocié) × quantité, au centime. */
export const commissionDe = (prixNegocieHt: number, prixAfficheHt: number, quantite: number) => centimes((prixAfficheHt - prixNegocieHt) * quantite);

export const negoceMasque = (departement: string) => `Négoce vérifié dans le ${departement}`;
export const LIGNE_NEGOCIE_PAR_MOBIIZ = "Négocié pour vous par Mobiiz";
export const LIGNE_COMMISSION_INCLUSE = "Commission Mobiiz incluse dans le prix";

/** Ce que l'artisan voit des autres participants : jamais un nom ni une commune ; sous le seuil, pas même un nombre. */
export const participantsNegocie = (entreprises: number, departement: string, seuil = SEUIL_ANONYMAT_DEFAUT) => phraseParticipants(entreprises, departement, seuil);

/** L'alerte de veille : un regroupement se forme sur une ligne d'un de ses chantiers. */
export function phraseVeille(article: string, quantite: string, chantier: string): string {
  return `Un regroupement se forme sur ${article} dans ton secteur. Tu as ${quantite} dans le chantier ${chantier}, tu les ajoutes ?`;
}

/** Pas de notification de veille pour une ligne déjà commandée en perso, ni deux fois, ni après « Non merci ». */
export function veilleANotifier(b: { statut: StatutBesoinNegocie; notifieLe: Date | null; dateBesoin: Date; commandeEnPerso: boolean }, maintenant: Date): boolean {
  return b.statut === "veille" && !b.notifieLe && !b.commandeEnPerso && jourUtc(b.dateBesoin) >= jourUtc(maintenant);
}

// ———————————————————————————————————————————————— l'observatoire des prix

/** Seuils d'affichage de « Prix observés dans ton secteur » : 2 regroupements ou 5 réponses distinctes. */
export const OBSERVATOIRE_MIN_REGROUPEMENTS = 2;
export const OBSERVATOIRE_MIN_REPONSES = 5;
export const OBSERVATOIRE_MOIS = 3;

/** Un prix « environ » : au 5 centimes sous 10 €, au 50 centimes sous 100 €, à l'euro au-delà. */
export function arrondiObservatoire(prix: number): number {
  if (prix < 1) return Math.round(prix * 100) / 100;
  if (prix < 10) return centimes(arrondi(prix, 0.05));
  if (prix < 100) return centimes(arrondi(prix, 0.5));
  return Math.round(prix);
}

export interface ObservationPrix {
  article: string;
  prixUnitaireHt: number;
  departement: string;
  le: Date;
  type: "perso" | "groupe";
  /** Un identifiant de la réponse ou du regroupement d'origine, pour compter les sources distinctes (jamais un nom). */
  source: string;
}

/** La moyenne observée d'un article dans un département sur 3 mois, ou null sous les seuils. */
export function prixObserve(obs: readonly ObservationPrix[], article: string, departement: string, maintenant: Date): { environ: number; regroupements: number; reponses: number } | null {
  const depuis = new Date(maintenant);
  depuis.setUTCMonth(depuis.getUTCMonth() - OBSERVATOIRE_MOIS);
  const retenues = obs.filter((o) => o.article === article && o.departement === departement && o.le >= depuis && o.le <= maintenant);
  const regroupements = new Set(retenues.filter((o) => o.type === "groupe").map((o) => o.source)).size;
  const reponses = new Set(retenues.filter((o) => o.type === "perso").map((o) => o.source)).size;
  if (regroupements < OBSERVATOIRE_MIN_REGROUPEMENTS && reponses < OBSERVATOIRE_MIN_REPONSES) return null;
  const moyenne = retenues.reduce((s, o) => s + o.prixUnitaireHt, 0) / retenues.length;
  return { environ: arrondiObservatoire(moyenne), regroupements, reponses };
}

const eurosFr = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 }).replace(/\u202f/g, "\u00a0")} €`;

/** Sur une nouvelle demande : « Ton dernier prix : X €. Prix observé dans le 22 : environ Y €. » (ce qui existe des deux). */
export function phrasePrixRepere(dernier: number | null, observe: number | null, departement: string | null): string | null {
  const parts = [];
  if (dernier !== null) parts.push(`Ton dernier prix : ${eurosFr(dernier)}.`);
  if (observe !== null && departement) parts.push(`Prix observé dans le ${departement} : environ ${eurosFr(observe)}.`);
  return parts.length ? parts.join(" ") : null;
}

// ———————————————————————————————————————————————— la vérification des négoces

/** Codes NAF du commerce de matériaux (config `NAF_MATERIAUX`, ceux-ci par défaut, à faire relire par Greg). */
export const NAF_MATERIAUX_DEFAUT: readonly string[] = ["46.73A", "46.73B", "46.74A", "46.74B", "47.52A", "47.52B", "46.13Z", "46.90Z"];

/** Les messageries grand public : un e-mail chez elles ne prouve rien sur l'entreprise. */
export const DOMAINES_GRAND_PUBLIC: readonly string[] = [
  "gmail.com", "googlemail.com", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "neuf.fr", "laposte.net", "bbox.fr",
  "hotmail.fr", "hotmail.com", "outlook.fr", "outlook.com", "live.fr", "live.com", "yahoo.fr", "yahoo.com", "icloud.com", "me.com", "aol.com", "gmx.fr", "numericable.fr",
];

const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const MOTS_VIDES = new Set(["sarl", "sas", "sasu", "eurl", "sa", "ets", "etablissements", "societe", "groupe", "negoce", "materiaux", "les", "des", "and", "et"]);

/** Le domaine de l'e-mail correspond-il à l'entreprise ? (« point-p.fr » pour « POINT P », « bigmat-ploubalay.fr » pour « BIGMAT »). */
export function domaineDeLEntreprise(email: string, nomEntreprise: string): boolean {
  const domaine = (email.split("@")[1] ?? "").toLowerCase();
  if (!domaine || DOMAINES_GRAND_PUBLIC.includes(domaine)) return false;
  const etiquette = plat(domaine.split(".").slice(0, -1).join(""));
  const nom = plat(nomEntreprise);
  if (!etiquette || !nom) return false;
  if (nom.includes(etiquette) || etiquette.includes(nom)) return true;
  const mots = nomEntreprise
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 4 && !MOTS_VIDES.has(m));
  return mots.some((m) => etiquette.includes(m));
}

export type VerificationNegoce = { statut: "valide" } | { statut: "a_verifier"; raison: "domaine" } | { statut: "refuse"; raison: "inconnue" | "fermee" | "activite" };

/** Le verdict à l'inscription : entreprise inconnue, fermée ou hors matériaux = refus ; sinon validé si le domaine colle. */
export function verifierNegoce(
  entreprise: { trouvee: boolean; active: boolean; naf: string | null; nom: string } | null,
  email: string,
  naf: readonly string[] = NAF_MATERIAUX_DEFAUT,
): VerificationNegoce {
  if (!entreprise || !entreprise.trouvee) return { statut: "refuse", raison: "inconnue" };
  if (!entreprise.active) return { statut: "refuse", raison: "fermee" };
  const code = (entreprise.naf ?? "").toUpperCase().replace(/^(\d{2})\.?(\d{2})([A-Z])$/, "$1.$2$3");
  if (!naf.includes(code)) return { statut: "refuse", raison: "activite" };
  return domaineDeLEntreprise(email, entreprise.nom) ? { statut: "valide" } : { statut: "a_verifier", raison: "domaine" };
}

export const PHRASES_REFUS_NEGOCE: Readonly<Record<"inconnue" | "fermee" | "activite", string>> = {
  inconnue: "Ce SIRET ne correspond à aucune entreprise connue.",
  fermee: "Cette entreprise est fermée d'après le registre.",
  activite: "Cette entreprise n'a pas une activité de commerce de matériaux.",
};

// ———————————————————————————————————————————————— « Préviens ton négoce »

export const PREVIENS_TITRE = "Ton négoce ne connaît pas encore Mobiiz. Préviens-le, ça prend 2 minutes et tu auras ta réponse plus vite.";
export const PREVIENS_SMS = "Salut, je t'envoie ma demande de prix par Mobiiz, tu vas recevoir un mail de contact@mobiiz.fr, c'est bien moi.";
/** L'écran ne s'affiche que pour un négoce qui n'a jamais répondu sur Mobiiz et que l'artisan n'a pas déjà prévenu. */
export const afficherPreviens = (n: { aDejaReponduSurMobiiz: boolean; prevenuLe: Date | null }) => !n.aDejaReponduSurMobiiz && !n.prevenuLe;
export const lienSms = (telephone: string | null, texte = PREVIENS_SMS) => `sms:${(telephone ?? "").replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(texte)}`;
export const lienTel = (telephone: string) => `tel:${telephone.replace(/[^\d+]/g, "")}`;
