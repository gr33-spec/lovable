import { LIBELLES_FAMILLES, type FamilleGroupe, type FenetreLivraison } from "./groupe.js";
import { NOM_COMMANDE_COMMUNE, duNom } from "./nom.js";
import { NOM_APP } from "./marque.js";

/**
 * LA DEMANDE AUX NÉGOCES (parcours groupé, étape 5), en code pur : l'e-mail part au nom de la « Regroupement »
 * (`NOM_COMMANDE_COMMUNE`), depuis l'adresse BatiClair, à tous les négoces du département qui vendent la
 * famille du lot ; un généraliste reçoit toutes ses familles dans un seul e-mail. Le PDF a deux parties : le total ferme
 * et le volume probable par référence, puis une ligne par chantier (adresse, quantité, fenêtre) sans nom de client.
 * RÉMUNÉRATION (Greg, 24 octobre 2026) : plus aucune commission de 2 %. Une formulation unique partout (e-mail, page
 * de dépôt, contrat, conditions) : `PHRASE_REMUNERATION_NEGOCE`. La facturation automatique des négoces dort derrière le
 * drapeau `FACTURATION_NEGOCE` (éteint) ; son code reste, ainsi que l'ancien contrat (`texteContratCommission`).
 */
export const NOM_DEMANDE = NOM_COMMANDE_COMMUNE;
/**
 * Le nom tel qu'il figure au contrat. Texte juridique : il ne change qu'avec la version du contrat (`VERSION_CONTRAT`).
 */
const NOM_AU_CONTRAT = NOM_COMMANDE_COMMUNE;
/** Le taux de l'ancien contrat (2026-10-20 et 2026-10-22), gardé pour la facturation qui dort derrière `FACTURATION_NEGOCE`. */
export const TAUX_COMMISSION_POURCENT = 2;
/** La formulation unique de la rémunération (Greg, 24 octobre 2026), mot pour mot, partout où un négoce la lit. */
export const PHRASE_REMUNERATION_NEGOCE = "Aucun frais pour l'instant. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce.";
/** La version du contrat acceptée par le négoce (gardée dans l'accord) : 2026-10-24, sans commission. */
export const VERSION_CONTRAT = "2026-10-24";
/** Dans l'e-mail, en gras : la formulation unique (plus de 2 %). */
export const PHRASE_COMMISSION = PHRASE_REMUNERATION_NEGOCE;
/** La case obligatoire de la page de dépôt : les conditions, sans taux. */
export const PHRASE_ACCORD = "J'accepte les conditions du regroupement";
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
    `${NOM_DEMANDE}, par ${NOM_APP}`,
  ];
  return { intro, parLot, fin };
}

/** Le corps en texte : la phrase de rémunération entourée d'astérisques et en capitales, faute de gras. */
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

/** Le même corps en HTML : la phrase de rémunération EN GRAS. */
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
 * LES CONDITIONS DU LOT (version 2026-10-24, sans commission). PROJET À FAIRE RELIRE PAR L'AVOCAT avant toute ouverture.
 */
export function texteContrat(version = VERSION_CONTRAT): string[] {
  if (version !== VERSION_CONTRAT) return texteContratCommission(version);
  return [
    `Conditions ${duNom()} pour les négoces, version ${version}`,
    `1. Objet. BATI INVEST (${NOM_APP}) met en relation des artisans réunis dans le « ${NOM_AU_CONTRAT} » et des négoces de matériaux. Le négoce répond librement, par un devis, à une demande de prix ${duNom()}.`,
    `2. Rémunération. ${PHRASE_REMUNERATION_NEGOCE}`,
    `3. Aucun autre frais. Répondre est gratuit ; un devis retenu ou non ne donne lieu à aucune facturation. ${NOM_APP} n'encaisse aucun paiement de commande, n'est ni acheteur ni revendeur, et ne porte aucun risque d'impayé des artisans. Le contrat de vente est conclu directement entre l'artisan et le négoce.`,
    "4. Concurrence. Les prix d'un négoce ne sont jamais communiqués à un autre négoce, ni pendant ni après la consultation.",
    "5. Acceptation. L'acceptation se fait en cochant la case sur la page de dépôt du devis ; la date, l'adresse e-mail et l'adresse IP de l'acceptation sont enregistrées. Sans acceptation, le devis n'est pas pris en compte.",
    "6. Retrait. Le négoce peut à tout moment cesser de recevoir des demandes (lien « stop »).",
  ];
}

/**
 * L'ANCIEN CONTRAT DE COMMISSION (versions 2026-10-20 et 2026-10-22), gardé pour les accords déjà enregistrés et pour la
 * facturation qui dort derrière `FACTURATION_NEGOCE`. Il n'est plus proposé à aucun négoce.
 */
export function texteContratCommission(version = "2026-10-22"): string[] {
  return [
    `Conditions de commission d'apporteur d'affaires, version ${version}`,
    `1. Objet. ${NOM_APP} met en relation des artisans réunis dans le « ${NOM_AU_CONTRAT} » et des négoces de matériaux. Le négoce répond librement, par un devis, à une demande de prix ${duNom()}.`,
    `2. Commission. Si le devis du négoce est retenu pour un lot, le négoce verse à ${NOM_APP} une commission d'apporteur d'affaires de ${TAUX_COMMISSION_POURCENT} % du montant hors taxes du lot, c'est-à-dire de la somme des bons de commande des artisans du lot passés chez lui au tarif ${duNom()}.`,
    `3. Facturation. La commission est facturée par ${NOM_APP} au négoce au moment de la transmission des bons de commande, payable à 30 jours. Une relance automatique est envoyée après l'échéance.`,
    `4. Aucun autre frais. Répondre est gratuit ; un devis non retenu ne donne lieu à aucune facturation. ${NOM_APP} n'encaisse aucun paiement de commande, n'est ni acheteur ni revendeur, et ne porte aucun risque d'impayé des artisans.`,
    "5. Acceptation. L'acceptation se fait en cochant la case sur la page de dépôt du devis ; la date, l'adresse e-mail et l'adresse IP de l'acceptation sont enregistrées. Sans acceptation, le devis n'est pas pris en compte.",
    "6. Retrait. Le négoce peut à tout moment cesser de recevoir des demandes (lien « stop ») ; les commissions dues sur les lots déjà retenus restent dues.",
  ];
}
