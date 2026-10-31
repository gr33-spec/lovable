import type { MessageArtisan } from "./notifications.js";
import { auNom } from "./nom.js";
import { NOM_APP } from "./marque.js";

/**
 * NOUVEAU CAP DU 22 OCTOBRE 2026 (décidé avec Greg, section 0 du doc « BatiClair Groupé », prioritaire sur les sections
 * suivantes), en code pur : le compteur du groupe, l'alerte à chaque devis de négoce, la livraison par zone et le suivi
 * façon colis. Promesse : « Paie tes matériaux moins cher ». Ce module ne touche ni à l'abonnement ni aux 2 % (en
 * suspens).
 */

const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pluriel = (n: number, un: string, plusieurs: string) => `${n.toLocaleString("fr-FR")} ${n > 1 ? plusieurs : un}`;

// ——— Le compteur du groupe ———

/**
 * « Écran compteur : 30 couvreurs, 15 demandes envoyées, 3 devis reçus, meilleur prix 1,12 € ». Les lignes identiques d'un
 * même secteur forment un groupe ; le compteur le dit à chaque artisan du groupe (le nouveau cap remplace « un artisan ne
 * voit jamais le nombre d'autres artisans » ; jamais leurs noms ni leurs chantiers).
 */
export interface CompteurDuGroupe {
  /** Les entreprises qui ont la ligne dans le groupe (l'artisan compris). */
  artisans: number;
  /** Les négoces à qui la demande commune est partie. */
  demandes: number;
  /** Les devis déposés par ces négoces. */
  devis: number;
  /** Le meilleur prix unitaire HT lu, ou null. */
  meilleurPrix: number | null;
}

/** Le métier dit qui est compté : « couvreurs » pour un couvreur, « artisans » sinon (multimétier, Greg, 23 octobre au soir). */
export function qui(metier: string | null | undefined, n: number): string {
  return metier === "roofing" || metier === "couverture" ? pluriel(n, "couvreur", "couvreurs") : pluriel(n, "artisan", "artisans");
}

export function phraseCompteur(c: CompteurDuGroupe, metier?: string | null): string {
  const morceaux = [qui(metier, c.artisans)];
  if (c.demandes === 0) morceaux.push("demande commune pas encore partie");
  else {
    morceaux.push(pluriel(c.demandes, "demande envoyée", "demandes envoyées"));
    morceaux.push(pluriel(c.devis, "devis reçu", "devis reçus"));
  }
  if (c.meilleurPrix !== null) morceaux.push(`meilleur prix ${euros(c.meilleurPrix)}`);
  return morceaux.join(", ");
}

// ——— L'alerte à chaque devis ———

/** Au-delà de 10 % au-dessus du meilleur prix, le devis n'est plus « légèrement » plus haut. */
export const ECART_LEGER_POURCENT = 10;

/**
 * « Alerte à chaque nouveau devis : « Nouveau meilleur prix » ou « Devis de X, légèrement plus haut ». » Le devis est lu une
 * seule fois à son arrivée ; la comparaison est du code. `meilleurAvant` : le meilleur prix des devis déjà lus, ou null.
 */
export function messageNouveauDevis(d: { numero: number; designation: string; negoce: string; prixUnitaire: number; meilleurAvant: number | null }): MessageArtisan {
  const ligne = `${d.designation.charAt(0).toLowerCase()}${d.designation.slice(1)}`;
  const etiquette = `groupe-devis-${d.numero}`;
  if (d.meilleurAvant === null || d.prixUnitaire < d.meilleurAvant) {
    return { titre: "Nouveau meilleur prix", corps: `${euros(d.prixUnitaire)} HT chez ${d.negoce} pour ${ligne}.`, url: "/groupe", etiquette };
  }
  const ecart = d.meilleurAvant > 0 ? ((d.prixUnitaire - d.meilleurAvant) / d.meilleurAvant) * 100 : 0;
  // Plan « finition » (22 octobre) : au même prix, on ne dit pas « plus haut ».
  const plusHaut = d.prixUnitaire === d.meilleurAvant ? "au même prix" : ecart <= ECART_LEGER_POURCENT ? "légèrement plus haut" : "plus haut";
  return {
    titre: "Nouveau devis",
    corps: `Devis de ${d.negoce}, ${plusHaut} : ${euros(d.prixUnitaire)} HT contre ${euros(d.meilleurAvant)} pour ${ligne}.`,
    url: "/groupe",
    etiquette,
  };
}

// ——— La livraison par zone ———

/**
 * « Livraison : prix par zone obligatoire dans la réponse du négoce ; l'app affiche à chaque couvreur son prix livré chez
 * lui, comparé à son prix habituel s'il l'a saisi. » Une ZONE est la commune d'un chantier du lot (code postal et ville),
 * lue dans l'adresse de livraison : le négoce chiffre la livraison là où il livre vraiment.
 */
export function zoneDeLivraison(adresse: string | null | undefined): string | null {
  const m = /\b(\d{5})\s*,?\s*([A-Za-zÀ-ÖØ-öø-ÿ'’ -]{2,})/.exec(adresse ?? "");
  if (!m) return null;
  const ville = m[2]!.trim().replace(/\s+/g, " ").replace(/\s*-\s*$/, "");
  return ville ? `${m[1]} ${ville}` : m[1]!;
}

/** Les zones d'un lot, dans l'ordre d'arrivée, sans doublon. */
export function zonesDuLot(adresses: readonly string[]): string[] {
  return [...new Set(adresses.map(zoneDeLivraison).filter((z): z is string => z !== null))];
}

export interface PrixDeLivraison {
  zone: string;
  /** Prix HT de la livraison dans la zone, tel que saisi (« 45 », « 45,00 »). */
  prixHt: string;
}

const lireMontant = (t: string) => {
  const s = t.replace(/[\s €]/g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : null;
};

/** Chaque zone du lot a son prix (zéro accepté : franco) ; sinon la liste des zones sans prix. */
export function livraisonComplete(zones: readonly string[], saisis: readonly PrixDeLivraison[]): { ok: true; prix: { zone: string; prixHt: number }[] } | { ok: false; manquantes: string[] } {
  const prix: { zone: string; prixHt: number }[] = [];
  const manquantes: string[] = [];
  for (const zone of zones) {
    const s = saisis.find((x) => x.zone === zone);
    const n = s ? lireMontant(s.prixHt) : null;
    if (n === null) manquantes.push(zone);
    else prix.push({ zone, prixHt: n });
  }
  return manquantes.length ? { ok: false, manquantes } : { ok: true, prix };
}

/** Le total des livraisons d'une réponse sur les zones du lot (pour comparer les négoces livraison comprise). */
export function totalLivraison(prix: readonly { zone: string; prixHt: number }[], zones: readonly string[]): number {
  return zones.reduce((t, z) => t + (prix.find((p) => p.zone === z)?.prixHt ?? 0), 0);
}

/**
 * Le prix livré d'un artisan : sa quantité au prix du lot, plus la livraison de SA zone ; comparé à son prix habituel
 * (prix unitaire déclaré × quantité) quand il l'a saisi.
 */
export function prixLivre(o: { quantite: number; prixUnitaire: number; livraisonZone: number | null; prixHabituel: number | null }): { totalHt: number; livraisonHt: number; habituelHt: number | null; economieHt: number | null } {
  const arrondi = (n: number) => Math.round(n * 100) / 100;
  const livraisonHt = o.livraisonZone ?? 0;
  const totalHt = arrondi(o.quantite * o.prixUnitaire + livraisonHt);
  const habituelHt = o.prixHabituel === null ? null : arrondi(o.quantite * o.prixHabituel);
  return { totalHt, livraisonHt, habituelHt, economieHt: habituelHt === null ? null : arrondi(habituelHt - totalHt) };
}

// ——— Le suivi façon colis ———

/** « Suivi façon colis sur chaque chantier : Liste prête → Prix demandés → Prix reçus → Commandé. » */
export const ETAPES_SUIVI = ["Liste prête", "Prix demandés", "Prix reçus", "Commandé"] as const;

export interface EtatDuChantier {
  /** Une liste existe, avec au moins une ligne. */
  liste: boolean;
  /** Le devis est lu mais la liste n'est pas encore calculée : des questions attendent (plan « finition », bloc 5). */
  questions?: boolean;
  /** Des lignes restent à régler (orange) avant l'envoi. */
  lignesARegler: number;
  /** Négoces à qui une demande de prix est partie (envoi seul ou demande commune du groupe). */
  demandes: number;
  /** Devis reçus (envoi seul ou groupe). */
  devis: number;
  /** Une offre retenue, un bon de commande ou « commandé » déclaré. */
  commande: boolean;
  /** Le meilleur prix reçu (total HT de l'envoi seul, ou unitaire du groupe), pour la phrase ; null sinon. */
  meilleur?: string | null;
}

export interface Suivi {
  /** Index de la dernière étape faite (-1 : rien encore, la liste se prépare). */
  etape: number;
  etapes: { nom: (typeof ETAPES_SUIVI)[number]; fait: boolean }[];
  /** Ce qui se passe. */
  phrase: string;
  /** Ce qu'il faut faire, ou null quand il n'y a qu'à attendre. */
  aFaire: string | null;
}

export function suiviDuChantier(e: EtatDuChantier): Suivi {
  const etape = e.commande ? 3 : e.devis > 0 ? 2 : e.demandes > 0 ? 1 : e.liste ? 0 : -1;
  const etapes = ETAPES_SUIVI.map((nom, i) => ({ nom, fait: i <= etape }));
  if (etape === -1 && e.questions) return { etape, etapes, phrase: "Ta liste se prépare.", aFaire: "Réponds aux questions, puis « Calculer ma liste »." };
  if (etape === -1) return { etape, etapes, phrase: "Ta liste se prépare.", aFaire: "Donne ta liste de matériaux : une photo, un PDF ou une capture." };
  if (etape === 0) {
    return e.lignesARegler > 0
      ? { etape, etapes, phrase: "Ta liste est là.", aFaire: `Règle ${pluriel(e.lignesARegler, "ligne orange", "lignes orange")}, puis envoie-la à tes négoces.` }
      : { etape, etapes, phrase: "Ta liste est prête.", aFaire: `Envoie-la à tes négoces, ou ajoute-la ${auNom()}.` };
  }
  if (etape === 1) return { etape, etapes, phrase: `Demande envoyée à ${pluriel(e.demandes, "négoce", "négoces")}. Tu seras prévenu à chaque réponse.`, aFaire: null };
  if (etape === 2) {
    const meilleur = e.meilleur ? ` Meilleur prix : ${e.meilleur}.` : "";
    return { etape, etapes, phrase: `${pluriel(e.devis, "devis reçu", "devis reçus")} sur ${pluriel(e.demandes, "demande", "demandes")}.${meilleur}`, aFaire: "Ouvre les devis et retiens le négoce de ton choix." };
  }
  return { etape, etapes, phrase: "C'est commandé.", aFaire: "Dis « Livré » quand c'est arrivé." };
}

// ——— Le mail d'information au négoce ———

/**
 * « Un mail prévient aussi chaque négoce qu'il existe un regroupement de couvreurs. » Envoyé une fois, quand un artisan
 * ajoute un négoce qui n'était pas encore dans la base du secteur ; jamais le nom des autres artisans ni leurs chantiers.
 */
export function mailRegroupementAuNegoce(m: { negoce: string; departement: string; familles: readonly string[]; artisan: string; stop: string }): { objet: string; texte: string } {
  const qui = m.familles.includes("couverture") ? "couvreurs" : "artisans";
  const secteur = m.departement === "22" ? "des Côtes-d'Armor" : `du ${m.departement}`;
  return {
    objet: `Un regroupement ${qui === "couvreurs" ? "de couvreurs" : "d'artisans"} existe dans votre secteur`,
    texte: [
      "Bonjour,",
      "",
      `${m.artisan} vous a indiqué comme son négoce sur ${NOM_APP}. Des ${qui} ${secteur} y regroupent leurs listes de matériaux pour obtenir un meilleur prix.`,
      "",
      "Quand plusieurs d'entre eux ont besoin des mêmes articles, vous recevez une demande de prix commune par e-mail : un lien, vous déposez votre devis avec vos conditions de livraison (gratuite jusqu'à une distance que vous fixez, un prix par livraison au-delà). Rien à installer, aucun compte à créer.",
      "",
      `Pour ne plus rien recevoir : ${m.stop}`,
      "",
      NOM_APP,
    ].join("\n"),
  };
}

// ——— La livraison : franco jusqu'à X km, Y € au-delà (décision de Greg, 22 octobre, après les zones) ———

/**
 * « Le négoce donne deux chiffres seulement, « livraison gratuite jusqu'à X km » et « Y € par livraison au-delà ». L'app
 * calcule la distance jusqu'au chantier et affiche à chaque artisan son prix livré. » Le négoce donne aussi l'adresse d'où
 * partent ses livraisons (son dépôt) : sans elle, pas de distance. Remplace le prix par zone (gardé dans le code, plus
 * utilisé).
 */
export interface RegleDeLivraison {
  /** L'adresse d'où partent les livraisons. */
  depart: string;
  /** Livraison gratuite jusqu'à cette distance (km, par la route). */
  francoKm: number;
  /** Prix HT d'une livraison au-delà. */
  prixAuDela: number;
}

/** Un point géocodé (degrés décimaux). */
export interface Point {
  lat: number;
  lon: number;
}

/**
 * La route n'est pas la ligne droite : la distance à vol d'oiseau est multipliée par 1,3 (détour moyen des routes
 * françaises, ordre de grandeur courant en logistique), arrondie au kilomètre.
 */
export const FACTEUR_ROUTE = 1.3;

export function distanceRouteKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  const volOiseau = 2 * 6371 * Math.asin(Math.sqrt(h));
  return Math.round(volOiseau * FACTEUR_ROUTE);
}

/**
 * Le prix d'UNE livraison sur un chantier : gratuite jusqu'à `francoKm`, `prixAuDela` au-delà. Une distance inconnue
 * (adresse introuvable) se compte au-delà : on n'annonce jamais une livraison gratuite qu'on n'a pas vérifiée.
 */
export function fraisDeLivraison(distanceKm: number | null, regle: Pick<RegleDeLivraison, "francoKm" | "prixAuDela">): number {
  return distanceKm !== null && distanceKm <= regle.francoKm ? 0 : regle.prixAuDela;
}

/** La saisie du négoce, lue : l'adresse non vide, deux nombres positifs (« 30 », « 45,00 »). */
export function lireRegleDeLivraison(saisie: { depart?: string | null; francoKm?: string | null; prixAuDela?: string | null }): RegleDeLivraison | null {
  const depart = saisie.depart?.trim() ?? "";
  const km = lireMontant(saisie.francoKm ?? "");
  const prix = lireMontant(saisie.prixAuDela ?? "");
  if (depart.length < 5 || km === null || prix === null || km > 1000) return null;
  return { depart, francoKm: km, prixAuDela: prix };
}
