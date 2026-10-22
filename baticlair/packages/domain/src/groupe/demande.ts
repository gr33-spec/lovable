import { LIBELLES_FAMILLES, type FamilleGroupe, type FenetreLivraison } from "./groupe.js";
import { NOM_COMMANDE_COMMUNE, nomCommun } from "./nom.js";

/**
 * LA DEMANDE AUX NÉGOCES (parcours groupé, étape 5), en code pur : l'e-mail part au nom de la « Commande commune »
 * (`NOM_COMMANDE_COMMUNE`), depuis l'adresse BatiClair, à tous les négoces du département qui vendent la
 * famille du lot ; un généraliste reçoit toutes ses familles dans un seul e-mail. Le PDF a deux parties : le total ferme
 * et le volume probable par référence, puis une ligne par chantier (adresse, quantité, fenêtre) sans nom de client.
 * Décision du fondateur (2026-10-20) : le négoce accepte AVANT de répondre une commission de 2 % du montant HT du lot s'il
 * est retenu (phrase en gras dans l'e-mail, case obligatoire sur la page de dépôt, contrat à côté).
 */
export const NOM_DEMANDE = NOM_COMMANDE_COMMUNE;
/**
 * Le nom tel qu'il figure au contrat de commission. Texte juridique : il ne change qu'avec la version du contrat
 * (`VERSION_CONTRAT`) ; « Regroupement artisans » → « Commande commune » le 22 octobre (décision de Greg), version 2026-10-22.
 */
const NOM_AU_CONTRAT = NOM_COMMANDE_COMMUNE;
export const TAUX_COMMISSION_POURCENT = 2;
/** La version du contrat de commission acceptée par le négoce (gardée dans l'accord). */
export const VERSION_CONTRAT = "2026-10-22";
/** Section 6, mot pour mot : dans l'e-mail, en gras. */
export const PHRASE_COMMISSION = `En répondant, vous acceptez de reverser ${TAUX_COMMISSION_POURCENT} % du montant HT du lot à BatiClair si votre offre est retenue. Intégrez-les à votre prix.`;
/** Section 7, étape 5, mot pour mot : la case obligatoire de la page de dépôt. */
export const PHRASE_ACCORD = `J'accepte de reverser ${TAUX_COMMISSION_POURCENT} % du montant HT du lot à BatiClair si mon offre est retenue`;
/** Les réponses sont attendues sous sept jours (section 3 : « Réponses attendues sous 7 jours »). */
export const DELAI_REPONSE_JOURS = 7;

export interface ChantierDeLot {
  adresse: string;
  quantite: string;
  unite: string;
  fenetre: FenetreLivraison;
  /** Signé (ferme) ou en attente (probable). */
  ferme: boolean;
}

export interface LotADemander {
  numero: number;
  designation: string;
  famille: FamilleGroupe | string;
  zone: string;
  unite: string;
  fenetre: FenetreLivraison;
  chantiers: readonly ChantierDeLot[];
  /** Le lien unique de réponse de CE négoce pour CE lot (`reponse/<jeton>`). */
  lienReponse: string;
}

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const somme = (c: readonly ChantierDeLot[]) => c.reduce((s, x) => s + Number(x.quantite), 0);

/** Les volumes d'un lot : ferme (signé) et probable (en attente). */
export function volumesDuLot(lot: Pick<LotADemander, "chantiers" | "unite">): { ferme: string; probable: string } {
  return { ferme: `${nombre(somme(lot.chantiers.filter((c) => c.ferme)))} ${lot.unite}`, probable: `${nombre(somme(lot.chantiers.filter((c) => !c.ferme)))} ${lot.unite}` };
}

/** Le négoce reçoit un lot quand il est du département du lot, vend sa famille et n'a pas dit « stop ». */
export function negoceConcerne(negoce: { departement: string; familles: readonly string[]; stop: boolean }, lot: { zone: string; famille: string }): boolean {
  return !negoce.stop && negoce.departement === lot.zone && negoce.familles.includes(lot.famille);
}

/** L'objet de l'e-mail : un lot, ou plusieurs pour un généraliste. */
export function objetDemande(lots: readonly LotADemander[], departement: string): string {
  if (lots.length === 1) return `${NOM_DEMANDE} : demande de prix, ${lots[0]!.designation} (${departement})`;
  return `${NOM_DEMANDE} : ${lots.length} demandes de prix (${departement})`;
}

function paragraphesDemande(lots: readonly LotADemander[]): { intro: string[]; parLot: { titre: string; lignes: string[]; lien: string }[]; fin: string[] } {
  const intro = [
    "Bonjour,",
    `Des artisans de votre département regroupent leurs besoins fermes pour vous demander un prix de volume : chacun commande ensuite sur son propre compte chez vous, est livré sur son chantier et vous paie comme d'habitude. Le volume ferme est engagé ; le volume probable vous est donné à titre indicatif.`,
  ];
  const parLot = lots.map((lot) => {
    const v = volumesDuLot(lot);
    const fermes = lot.chantiers.filter((c) => c.ferme).length;
    return {
      titre: `Lot n° ${lot.numero} : ${lot.designation}`,
      lignes: [
        `Volume ferme : ${v.ferme} (${fermes} chantier${fermes > 1 ? "s" : ""}) ; volume probable : ${v.probable}.`,
        `Livraison entre le ${jour(lot.fenetre.tot)} et le ${jour(lot.fenetre.tard)}, par chantier (adresses dans le PDF joint).`,
        `Déposez votre devis (un ou deux, par palier de quantité) par ce lien, sans compte ni formulaire :`,
      ],
      lien: lot.lienReponse,
    };
  });
  const fin = [
    `Réponse attendue sous ${DELAI_REPONSE_JOURS} jours. Un seul négoce est retenu par lot, pour tout le volume. Si le lot ne vous concerne pas, un clic sur « pas concerné » suffit ; « stop » pour ne plus rien recevoir.`,
    `${NOM_DEMANDE}, par BatiClair`,
  ];
  return { intro, parLot, fin };
}

/** Le corps en texte : la phrase de commission entourée d'astérisques et en capitales, faute de gras. */
export function texteDemande(lots: readonly LotADemander[], liens: { pasConcerne: string; stop: string }): string {
  const p = paragraphesDemande(lots);
  return [
    ...p.intro,
    "",
    `** ${PHRASE_COMMISSION.toUpperCase()} **`,
    "",
    ...p.parLot.flatMap((l) => [l.titre, ...l.lignes, l.lien, ""]),
    ...p.fin,
    "",
    `Pas concerné : ${liens.pasConcerne}`,
    `Stop : ${liens.stop}`,
  ].join("\n");
}

const html = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Le même corps en HTML : la phrase de commission EN GRAS (décision du fondateur, 2026-10-20). */
export function htmlDemande(lots: readonly LotADemander[], liens: { pasConcerne: string; stop: string }): string {
  const p = paragraphesDemande(lots);
  const par = (t: string) => `<p>${html(t)}</p>`;
  return [
    ...p.intro.map(par),
    `<p><strong>${html(PHRASE_COMMISSION)}</strong></p>`,
    ...p.parLot.map((l) => `<h3>${html(l.titre)}</h3>${l.lignes.map(par).join("")}<p><a href="${html(l.lien)}">${html(l.lien)}</a></p>`),
    ...p.fin.map(par),
    `<p style="font-size:12px;color:#666"><a href="${html(liens.pasConcerne)}">Pas concerné</a> · <a href="${html(liens.stop)}">Stop</a></p>`,
  ].join("\n");
}

/** Le document PDF en deux parties (section 2, étape 5), en lignes de texte : la même source pour le PDF et les tests. */
export function documentDemande(lots: readonly LotADemander[], departement: string, date: Date): { titre: string; partie1: string[][]; partie2: { titre: string; lignes: string[][] }[]; pied: string } {
  const partie1 = [["Lot", "Référence", "Famille", "Volume ferme", "Volume probable", "Livraison"]];
  for (const lot of lots) {
    const v = volumesDuLot(lot);
    partie1.push([`n° ${lot.numero}`, lot.designation, LIBELLES_FAMILLES[lot.famille as FamilleGroupe] ?? lot.famille, v.ferme, v.probable, `du ${jour(lot.fenetre.tot)} au ${jour(lot.fenetre.tard)}`]);
  }
  const partie2 = lots.map((lot) => ({
    titre: `Lot n° ${lot.numero}, ${lot.designation} : livraison par chantier`,
    lignes: [["Adresse de livraison", "Quantité", "Fenêtre", "Engagement"], ...lot.chantiers.map((c) => [c.adresse, `${nombre(Number(c.quantite))} ${c.unite}`, `du ${jour(c.fenetre.tot)} au ${jour(c.fenetre.tard)}`, c.ferme ? "ferme" : "probable"])],
  }));
  return { titre: `${NOM_DEMANDE} : demande de prix, département ${departement}, le ${jour(date)}`, partie1, partie2, pied: PHRASE_COMMISSION };
}

/**
 * LE CONTRAT DE COMMISSION (décision du fondateur, 2026-10-20), version ${VERSION_CONTRAT}. PROJET À VALIDER PAR LE
 * FONDATEUR avant toute ouverture : le texte ci-dessous est une rédaction de travail, pas un texte juridique relu.
 */
export function texteContrat(version = VERSION_CONTRAT): string[] {
  return [
    `Conditions de commission d'apporteur d'affaires, version ${version}`,
    `1. Objet. BatiClair met en relation des artisans réunis dans la « ${NOM_AU_CONTRAT} » et des négoces de matériaux. Le négoce répond librement, par un devis, à une demande de prix de la ${nomCommun()}.`,
    `2. Commission. Si le devis du négoce est retenu pour un lot, le négoce verse à BatiClair une commission d'apporteur d'affaires de ${TAUX_COMMISSION_POURCENT} % du montant hors taxes du lot, c'est-à-dire de la somme des bons de commande des artisans du lot passés chez lui au tarif de la ${nomCommun()}.`,
    "3. Facturation. La commission est facturée par BatiClair au négoce au moment de la transmission des bons de commande, payable à 30 jours. Une relance automatique est envoyée après l'échéance.",
    "4. Aucun autre frais. Répondre est gratuit ; un devis non retenu ne donne lieu à aucune facturation. BatiClair n'encaisse aucun paiement de commande, n'est ni acheteur ni revendeur, et ne porte aucun risque d'impayé des artisans.",
    "5. Acceptation. L'acceptation se fait en cochant la case sur la page de dépôt du devis ; la date, l'adresse e-mail et l'adresse IP de l'acceptation sont enregistrées. Sans acceptation, le devis n'est pas pris en compte.",
    "6. Retrait. Le négoce peut à tout moment cesser de recevoir des demandes (lien « stop ») ; les commissions dues sur les lots déjà retenus restent dues.",
  ];
}
